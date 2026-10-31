import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import {
  HERMES_WA_CANCEL_MEDIA_UPLOAD,
  HERMES_WA_FINALIZE_MEDIA_UPLOAD,
  HERMES_WA_PREPARE_MEDIA_UPLOAD,
} from '@/hermes-wa-runtime/graphql/metadata-mutations/hermesWaMediaUpload';
import { useHermesWaMediaUpload } from '@/hermes-wa-runtime/hooks/useHermesWaMediaUpload';

// ISOLATED DOUBLES. Evolution is absent and no native blob store is connected
// here: the quarantine target is a stubbed fetch and every GraphQL answer is a
// fixture. This proves the browser half of the upload-then-send path, not a
// provider integration and not durable storage.

const CONVERSATION_ID = '4c9e13f6-5d30-4b4c-ae3c-7c63d4f2f003';
const OTHER_CONVERSATION_ID = '5daf24a7-6e41-4c5d-bf4d-8d74e5f3f004';
const ASSET_ID = '6eb035b8-7f52-4d6e-c05e-9e85f6f4f005';
const UPLOAD_URL = '/rest/hermes/media/quarantine/6eb035b8?token=short-lived';

// A real Opus voice note: MediaRecorder reports the codec as a parameter, and
// the contract refuses a declared type that carries one. The whole voice path
// died once on exactly this, so it is tested on the parameterised string.
const OPUS_MIME = 'audio/ogg; codecs=opus';

const prepareMock = (
  variables: Record<string, unknown>,
  contentType: string,
): MockedResponse => ({
  request: { query: HERMES_WA_PREPARE_MEDIA_UPLOAD, variables },
  result: {
    data: {
      hermesPrepareMediaUpload: {
        assetId: ASSET_ID,
        uploadUrl: UPLOAD_URL,
        contentType,
        expiresAt: '2026-10-31T09:01:00.000Z',
      },
    },
  },
});

const finalizeMock = (
  status: string,
  mimeType: string,
  conversationId = CONVERSATION_ID,
): MockedResponse => ({
  request: {
    query: HERMES_WA_FINALIZE_MEDIA_UPLOAD,
    variables: { input: { conversationId, assetId: ASSET_ID } },
  },
  result: {
    data: {
      hermesFinalizeMediaUpload: {
        id: ASSET_ID,
        kind: 'AUDIO',
        filename: 'note.ogg',
        mimeType,
        size: 2048,
        status,
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

  const link = ApolloLink.from([recordingLink, new MockLink(mocks)]);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider link={link}>{children}</MockedProvider>
  );

  return {
    wrapper,
    operationNames: () => operations.map((each) => each.operationName),
    variablesOf: (name: string) =>
      operations
        .filter((each) => each.operationName === name)
        .map((each) => each.variables),
  };
};

type FetchCall = { url: string; init: RequestInit };

const stubFetch = (response: { ok: boolean; status?: number }) => {
  const calls: FetchCall[] = [];

  const fake = jest.fn((url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: (init ?? {}) as RequestInit });

    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      blob: () => Promise.resolve(new Blob([])),
    } as unknown as Response);
  });

  globalThis.fetch = fake as unknown as typeof fetch;

  return { calls };
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.resetAllMocks();
});

describe('useHermesWaMediaUpload', () => {
  it('emits nothing at all until a person uploads', () => {
    const { wrapper, operationNames } = wrap([]);

    renderHook(() => useHermesWaMediaUpload(), { wrapper });

    expect(operationNames()).toEqual([]);
  });

  it('carries a real Opus voice note through prepare, the raw PUT and finalize', async () => {
    const { wrapper, variablesOf, operationNames } = wrap([
      prepareMock(
        {
          input: {
            conversationId: CONVERSATION_ID,
            kind: 'AUDIO',
            filename: 'note.ogg',
            // The essence only. The parameters are stripped, and the type
            // itself is NOT rewritten into one the server might prefer.
            mimeType: 'audio/ogg',
            size: 2048,
          },
        },
        'audio/ogg',
      ),
      finalizeMock('READY', 'audio/ogg'),
    ]);

    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    const clip = new Blob([new Uint8Array(2048)], { type: OPUS_MIME });

    act(() => {
      result.current.upload(CONVERSATION_ID, clip, 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    // The parameterised MIME was compared on its essence and accepted, which
    // is the fix this voice path depends on.
    expect(variablesOf('HermesWaPrepareMediaUpload')).toEqual([
      {
        input: {
          conversationId: CONVERSATION_ID,
          kind: 'AUDIO',
          filename: 'note.ogg',
          mimeType: 'audio/ogg',
          size: 2048,
        },
      },
    ]);

    // The bytes went to the target the SERVER named, with the content type the
    // server named, as a raw PUT with the session attached.
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain(UPLOAD_URL);
    expect(calls[0].init.method).toBe('PUT');
    expect(calls[0].init.credentials).toBe('include');
    expect(calls[0].init.headers).toEqual({ 'Content-Type': 'audio/ogg' });
    expect(calls[0].init.body).toBe(clip);

    expect(operationNames()).toEqual([
      'HermesWaPrepareMediaUpload',
      'HermesWaFinalizeMediaUpload',
    ]);

    // Ready means the server said READY, and the asset id is what a reply
    // would carry. Uploading is still not sending.
    expect(result.current.state).toEqual({
      kind: 'ready',
      assetId: ASSET_ID,
      mimeType: 'audio/ogg',
    });
    expect(operationNames()).not.toContain('HermesWaReplyV3');
  });

  it('uses the content type the server named even when it differs from the file', async () => {
    const { wrapper } = wrap([
      prepareMock(
        {
          input: {
            conversationId: CONVERSATION_ID,
            kind: 'AUDIO',
            filename: 'note.ogg',
            mimeType: 'audio/ogg',
            size: 2048,
          },
        },
        // The native sniff disagreed with the declared type. The server's
        // word is what the PUT must carry, or the sniff will disagree again.
        'application/ogg',
      ),
      finalizeMock('READY', 'audio/ogg'),
    ]);

    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([new Uint8Array(2048)], { type: OPUS_MIME }),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/ogg',
    });
  });

  it('keeps the authoritative MIME finalize returned rather than the local one', async () => {
    const { wrapper } = wrap([
      prepareMock(
        {
          input: {
            conversationId: CONVERSATION_ID,
            kind: 'AUDIO',
            filename: 'note.ogg',
            mimeType: 'audio/webm',
            size: 2048,
          },
        },
        'audio/webm',
      ),
      // The native sniff decided it was video/webm. This client does not argue.
      finalizeMock('READY', 'video/webm'),
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([new Uint8Array(2048)], { type: 'audio/webm;codecs=opus' }),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        kind: 'ready',
        assetId: ASSET_ID,
        mimeType: 'video/webm',
      });
    });
  });

  // READY is the server's decision. A finalize that answered anything else has
  // not produced a sendable asset, whatever else it returned.
  it.each(['PENDING', 'ATTACHED', 'REVOKED', 'ready-ish'])(
    'does not call an asset ready when finalize answered %s',
    async (status) => {
      const { wrapper, operationNames } = wrap([
        prepareMock(
          {
            input: {
              conversationId: CONVERSATION_ID,
              kind: 'AUDIO',
              filename: 'note.ogg',
              mimeType: 'audio/ogg',
              size: 2048,
            },
          },
          'audio/ogg',
        ),
        finalizeMock(status, 'audio/ogg'),
      ]);

      stubFetch({ ok: true });

      const { result } = renderHook(() => useHermesWaMediaUpload(), {
        wrapper,
      });

      act(() => {
        result.current.upload(
          CONVERSATION_ID,
          new Blob([new Uint8Array(2048)], { type: OPUS_MIME }),
          'note.ogg',
        );
      });

      await waitFor(() => {
        expect(result.current.state.kind).toBe('failed');
      });

      // The refusal has to come from the status finalize ANSWERED, not from a
      // path that never got there: without this the test would pass for a
      // prepare that was never matched.
      expect(operationNames()).toEqual([
        'HermesWaPrepareMediaUpload',
        'HermesWaFinalizeMediaUpload',
      ]);
      expect(result.current.state).not.toMatchObject({ kind: 'ready' });
    },
  );

  it('refuses an unaccepted type locally without touching the network', async () => {
    const { wrapper, operationNames } = wrap([]);
    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        // SVG is refused by the allow-list on purpose.
        new Blob([new Uint8Array(64)], { type: 'image/svg+xml' }),
        'logo.svg',
      );
    });

    expect(result.current.state).toEqual({
      kind: 'refusedLocally',
      reason: 'unacceptedType',
    });
    expect(operationNames()).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('refuses an empty capture before any limit is consulted', () => {
    const { wrapper, operationNames } = wrap([]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([], { type: OPUS_MIME }),
        'note.ogg',
      );
    });

    expect(result.current.state).toEqual({
      kind: 'refusedLocally',
      reason: 'empty',
    });
    expect(operationNames()).toEqual([]);
  });

  // A denial needs the GraphQL shape with FORBIDDEN. A bare `new Error()`
  // would read as a transport failure and the screen would offer a retry of a
  // decision.
  it('reads a refused prepare as denied and not as a failure', async () => {
    const { wrapper } = wrap([
      {
        request: {
          query: HERMES_WA_PREPARE_MEDIA_UPLOAD,
          variables: {
            input: {
              conversationId: CONVERSATION_ID,
              kind: 'AUDIO',
              filename: 'note.ogg',
              mimeType: 'audio/ogg',
              size: 2048,
            },
          },
        },
        result: {
          errors: [
            {
              message: 'MEDIA_NOT_ALLOWED',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        },
      },
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([new Uint8Array(2048)], { type: OPUS_MIME }),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('denied');
    });
  });

  it('fails without a ready asset when the quarantine PUT is rejected', async () => {
    const { wrapper, operationNames } = wrap([
      prepareMock(
        {
          input: {
            conversationId: CONVERSATION_ID,
            kind: 'AUDIO',
            filename: 'note.ogg',
            mimeType: 'audio/ogg',
            size: 2048,
          },
        },
        'audio/ogg',
      ),
    ]);

    stubFetch({ ok: false, status: 413 });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([new Uint8Array(2048)], { type: OPUS_MIME }),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('failed');
    });

    // Finalize is never reached: there are no bytes to finalize.
    expect(operationNames()).not.toContain('HermesWaFinalizeMediaUpload');
  });

  // The scope is captured before the first await, so a cancel acts on the
  // thread the asset belongs to and not on whichever one is on screen now.
  it('cancels the asset in the conversation it was prepared for', async () => {
    const { wrapper, variablesOf } = wrap([
      prepareMock(
        {
          input: {
            conversationId: CONVERSATION_ID,
            kind: 'AUDIO',
            filename: 'note.ogg',
            mimeType: 'audio/ogg',
            size: 2048,
          },
        },
        'audio/ogg',
      ),
      finalizeMock('READY', 'audio/ogg'),
      {
        request: {
          query: HERMES_WA_CANCEL_MEDIA_UPLOAD,
          variables: {
            input: { conversationId: CONVERSATION_ID, assetId: ASSET_ID },
          },
        },
        result: {
          data: { hermesCancelMediaUpload: { id: ASSET_ID, status: 'REVOKED' } },
        },
      },
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        new Blob([new Uint8Array(2048)], { type: OPUS_MIME }),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    const cancel = result.current.cancel;

    expect(cancel).not.toBeNull();

    act(() => {
      (cancel as () => void)();
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('cancelled');
    });

    // The ORIGINAL conversation, never the other one.
    expect(variablesOf('HermesWaCancelMediaUpload')).toEqual([
      { input: { conversationId: CONVERSATION_ID, assetId: ASSET_ID } },
    ]);
    expect(JSON.stringify(variablesOf('HermesWaCancelMediaUpload'))).not.toContain(
      OTHER_CONVERSATION_ID,
    );
  });

  it('offers no cancel before anything has been prepared', () => {
    const { wrapper } = wrap([]);

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    expect(result.current.cancel).toBeNull();
  });
});
