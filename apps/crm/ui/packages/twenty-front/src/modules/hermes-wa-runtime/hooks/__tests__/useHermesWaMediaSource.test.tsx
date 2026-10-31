import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { HERMES_WA_MEDIA_READ } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaMediaRead';
import { useHermesWaMediaSource } from '@/hermes-wa-runtime/hooks/useHermesWaMediaSource';

// ISOLATED DOUBLES. No provider and no native blob store: the media route is a
// stubbed fetch. This proves the browser can obtain and release the bytes of a
// received media, not that any real asset exists.

const CONVERSATION_ID = '7fc146c9-8063-4e7f-d16f-af96f7f5f006';
const ASSET_ID = '80d257da-9174-4f80-e270-ba07f8f6f007';
const DOWNLOAD_PATH = '/rest/hermes/media/80d257da/bytes?token=short-lived';

const mediaRead = (downloadPath: string): MockedResponse => ({
  request: {
    query: HERMES_WA_MEDIA_READ,
    variables: {
      input: { conversationId: CONVERSATION_ID, assetId: ASSET_ID },
    },
  },
  result: {
    data: {
      hermesMediaRead: {
        downloadPath,
        expiresAt: '2026-10-31T09:01:00.000Z',
        mimeType: 'image/jpeg',
        byteSize: 48123,
      },
    },
  },
});

const wrap = (mocks: MockedResponse[]) => {
  const operations: Operation[] = [];

  const recordingLink = new ApolloLink((operation, forward) => {
    operations.push(operation);

    return forward(operation);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider
      link={ApolloLink.from([recordingLink, new MockLink(mocks)])}
    >
      {children}
    </MockedProvider>
  );

  return {
    wrapper,
    operationNames: () => operations.map((each) => each.operationName),
  };
};

const originalFetch = globalThis.fetch;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

type Harness = {
  fetched: string[];
  created: string[];
  revoked: string[];
};

const stub = (response: { ok: boolean; status?: number }): Harness => {
  const harness: Harness = { fetched: [], created: [], revoked: [] };
  let minted = 0;

  globalThis.fetch = jest.fn((url: unknown) => {
    harness.fetched.push(String(url));

    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      blob: () => Promise.resolve(new Blob([new Uint8Array(8)])),
    } as unknown as Response);
  }) as unknown as typeof fetch;

  URL.createObjectURL = jest.fn(() => {
    minted += 1;
    const url = `blob:mock/${minted}`;

    harness.created.push(url);

    return url;
  }) as unknown as typeof URL.createObjectURL;

  URL.revokeObjectURL = jest.fn((url: string) => {
    harness.revoked.push(url);
  }) as unknown as typeof URL.revokeObjectURL;

  return harness;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  jest.resetAllMocks();
});

describe('useHermesWaMediaSource', () => {
  it('fetches nothing at mount: resolve is the only way in', () => {
    const { wrapper, operationNames } = wrap([mediaRead(DOWNLOAD_PATH)]);
    const harness = stub({ ok: true });

    const { result } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    expect(result.current.access).toEqual({ kind: 'idle' });
    expect(operationNames()).toEqual([]);
    expect(harness.fetched).toEqual([]);
  });

  it('resolves a received media to a revocable blob URL on a human action', async () => {
    const { wrapper, operationNames } = wrap([mediaRead(DOWNLOAD_PATH)]);
    const harness = stub({ ok: true });

    const { result } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('resolved');
    });

    expect(operationNames()).toEqual(['HermesWaMediaRead']);

    // The relative path the contract publishes, resolved against this
    // deployment's own base, with the session attached and no browser cache.
    expect(harness.fetched).toHaveLength(1);
    expect(harness.fetched[0]).toContain(DOWNLOAD_PATH);
    expect(result.current.access).toEqual({
      kind: 'resolved',
      objectUrl: harness.created[0],
    });
  });

  // The server names the path. An absolute or protocol-relative one would
  // retarget a request that carries the session at another origin.
  it.each([
    'https://evil.example.com/bytes',
    '//evil.example.com/bytes',
    'rest/hermes/media/bytes',
  ])('refuses the download path %s instead of following it', async (path) => {
    const { wrapper } = wrap([mediaRead(path)]);
    const harness = stub({ ok: true });

    const { result } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('failed');
    });

    // Nothing left the browser for that host.
    expect(harness.fetched).toEqual([]);
  });

  it.each([401, 403])(
    'reads an HTTP %s on the bytes as denied, not as a failure',
    async (status) => {
      const { wrapper } = wrap([mediaRead(DOWNLOAD_PATH)]);

      stub({ ok: false, status });

      const { result } = renderHook(
        () =>
          useHermesWaMediaSource({
            conversationId: CONVERSATION_ID,
            assetId: ASSET_ID,
          }),
        { wrapper },
      );

      act(() => {
        result.current.resolve();
      });

      await waitFor(() => {
        expect(result.current.access).toEqual({
          kind: 'denied',
          message: null,
        });
      });
    },
  );

  it('reads any other HTTP failure as failed rather than denied', async () => {
    const { wrapper } = wrap([mediaRead(DOWNLOAD_PATH)]);

    stub({ ok: false, status: 500 });

    const { result } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('failed');
    });

    expect(result.current.access).not.toMatchObject({ kind: 'denied' });
  });

  // A blob URL nobody revokes keeps a private media's bytes alive in the page
  // for as long as the document lives.
  it('revokes the blob URL when the component goes away', async () => {
    const { wrapper } = wrap([mediaRead(DOWNLOAD_PATH)]);
    const harness = stub({ ok: true });

    const { result, unmount } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('resolved');
    });

    const minted = harness.created[0];

    expect(harness.revoked).not.toContain(minted);

    unmount();

    expect(harness.revoked).toContain(minted);
  });

  it('revokes and forgets the previous media when the asset under it changes', async () => {
    const otherAssetId = '91e368eb-a285-4091-f381-cb18f9f7f008';

    const { wrapper } = wrap([
      mediaRead(DOWNLOAD_PATH),
      {
        request: {
          query: HERMES_WA_MEDIA_READ,
          variables: {
            input: {
              conversationId: CONVERSATION_ID,
              assetId: otherAssetId,
            },
          },
        },
        result: {
          data: {
            hermesMediaRead: {
              downloadPath: '/rest/hermes/media/91e368eb/bytes',
              expiresAt: '2026-10-31T09:01:00.000Z',
              mimeType: 'image/png',
              byteSize: 1024,
            },
          },
        },
      },
    ]);

    const harness = stub({ ok: true });

    const { result, rerender } = renderHook(
      ({ assetId }: { assetId: string }) =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId,
        }),
      { wrapper, initialProps: { assetId: ASSET_ID } },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('resolved');
    });

    const first = harness.created[0];

    rerender({ assetId: otherAssetId });

    // The previous media's URL is gone, and the state no longer describes it:
    // a resolved source from the asset that was here before must never be
    // rendered as this one's.
    await waitFor(() => {
      expect(result.current.access).toEqual({ kind: 'idle' });
    });
    expect(harness.revoked).toContain(first);
  });

  it('lets go of the bytes on an explicit release', async () => {
    const { wrapper } = wrap([mediaRead(DOWNLOAD_PATH)]);
    const harness = stub({ ok: true });

    const { result } = renderHook(
      () =>
        useHermesWaMediaSource({
          conversationId: CONVERSATION_ID,
          assetId: ASSET_ID,
        }),
      { wrapper },
    );

    act(() => {
      result.current.resolve();
    });

    await waitFor(() => {
      expect(result.current.access.kind).toBe('resolved');
    });

    const minted = harness.created[0];

    act(() => {
      result.current.release();
    });

    expect(harness.revoked).toContain(minted);
    expect(result.current.access).toEqual({ kind: 'idle' });
  });
});
