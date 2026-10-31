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
import {
  buildHermesWaOggOpusBlob,
  buildHermesWaOggOpusBytes,
} from '@/hermes-wa-runtime/hooks/__tests__/hermesWaOggOpusFixture';
import { useHermesWaMediaUpload } from '@/hermes-wa-runtime/hooks/useHermesWaMediaUpload';

// WHAT THESE TESTS COVER. The browser half of the upload-then-send path: the
// order of the three steps, which values are read from the server's answers
// instead of guessed locally, and what happens when two attempts overlap.
//
// WHAT THEY DO NOT COVER, and must not be read as covering. No microphone, no
// recorder and no provider is involved: Evolution is absent and no native blob
// store is connected. The quarantine target is a stubbed fetch and every
// GraphQL answer is a fixture. The audio fixture is a valid Ogg/Opus HEADER
// stream carrying no audio packets — it is at least what it claims to be,
// which the earlier zero-byte fixture was not, but it is not a recording and
// it decodes to no sound. The hook never inspects the bytes; it reads the
// declared type and the size. So these prove type and sequence handling over a
// well-formed container, not audio playback and not a provider integration.

const CONVERSATION_ID = '4c9e13f6-5d30-4b4c-ae3c-7c63d4f2f003';
const OTHER_CONVERSATION_ID = '5daf24a7-6e41-4c5d-bf4d-8d74e5f3f004';
const ASSET_ID = '6eb035b8-7f52-4d6e-c05e-9e85f6f4f005';
const SECOND_ASSET_ID = '7fc146c9-8063-4e7f-d16f-af96f7f5f006';
const UPLOAD_URL = '/rest/hermes/media/quarantine/6eb035b8?token=short-lived';
const SECOND_UPLOAD_URL =
  '/rest/hermes/media/quarantine/7fc146c9?token=short-lived';

// The type a recorder reports for Opus in Ogg. The contract refuses a declared
// type that carries parameters, so this string has to be reduced to its
// essence before prepare — the comparison that once killed the voice path.
const OPUS_MIME = 'audio/ogg; codecs=opus';
const OPUS_BYTE_SIZE = buildHermesWaOggOpusBytes().length;

const opusClip = (type = OPUS_MIME) => buildHermesWaOggOpusBlob(type);

const prepareInput = (overrides: Record<string, unknown> = {}) => ({
  input: {
    conversationId: CONVERSATION_ID,
    kind: 'AUDIO',
    filename: 'note.ogg',
    mimeType: 'audio/ogg',
    size: OPUS_BYTE_SIZE,
    ...overrides,
  },
});

const prepareMock = (
  variables: Record<string, unknown>,
  contentType: string,
  options: { assetId?: string; uploadUrl?: string; delay?: number } = {},
): MockedResponse => ({
  request: { query: HERMES_WA_PREPARE_MEDIA_UPLOAD, variables },
  ...(options.delay === undefined ? {} : { delay: options.delay }),
  result: {
    data: {
      hermesPrepareMediaUpload: {
        assetId: options.assetId ?? ASSET_ID,
        uploadUrl: options.uploadUrl ?? UPLOAD_URL,
        contentType,
        expiresAt: '2026-10-31T09:01:00.000Z',
      },
    },
  },
});

const finalizeMock = ({
  status = 'READY',
  mimeType = 'audio/ogg',
  kind = 'AUDIO',
  assetId = ASSET_ID,
  conversationId = CONVERSATION_ID,
  filename = 'note.ogg',
}: {
  status?: string;
  mimeType?: string;
  kind?: string | null;
  assetId?: string;
  conversationId?: string;
  filename?: string;
} = {}): MockedResponse => ({
  request: {
    query: HERMES_WA_FINALIZE_MEDIA_UPLOAD,
    variables: { input: { conversationId, assetId } },
  },
  result: {
    data: {
      hermesFinalizeMediaUpload: {
        id: assetId,
        kind,
        filename,
        mimeType,
        size: OPUS_BYTE_SIZE,
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

  globalThis.fetch = jest.fn((url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: (init ?? {}) as RequestInit });

    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      blob: () => Promise.resolve(new Blob([])),
    } as unknown as Response);
  }) as unknown as typeof fetch;

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

  it('prepares an Ogg/Opus stream as AUDIO on its MIME essence, then PUTs the bytes unchanged', async () => {
    const { wrapper, variablesOf, operationNames } = wrap([
      prepareMock(prepareInput(), 'audio/ogg'),
      finalizeMock(),
    ]);

    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    const clip = opusClip();

    act(() => {
      result.current.upload(CONVERSATION_ID, clip, 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    // The parameterised type was reduced to its essence and accepted. Without
    // that reduction the contract refuses the declared type outright.
    expect(variablesOf('HermesWaPrepareMediaUpload')).toEqual([prepareInput()]);

    // The bytes went to the target the SERVER named, with the content type the
    // server named, as a raw PUT with the session attached — and the body is
    // the very Blob handed in, not a re-encoding of it.
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

    // Uploading is still not sending.
    expect(result.current.state).toEqual({
      kind: 'ready',
      assetId: ASSET_ID,
      mimeType: 'audio/ogg',
      assetKind: 'AUDIO',
    });
    expect(operationNames()).not.toContain('HermesWaReplyV3');
  });

  it('uses the content type the server named even when it differs from the file', async () => {
    const { wrapper } = wrap([
      // The native sniff disagreed with the declared type. The server's word
      // is what the PUT must carry, or the sniff will disagree again.
      prepareMock(prepareInput(), 'application/ogg'),
      finalizeMock(),
    ]);

    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/ogg',
    });
  });

  // CATWA006. The server validates the kind at finalize; the MIME is not the
  // verdict. An Opus stream the native sniff called video/webm is AUDIO on the
  // server, and sending it as VIDEO is refused — the voice note never arrives.
  it('keeps the kind the server validated when the MIME disagrees with it', async () => {
    const { wrapper } = wrap([
      prepareMock(prepareInput({ mimeType: 'audio/webm' }), 'audio/webm'),
      finalizeMock({ mimeType: 'video/webm', kind: 'AUDIO' }),
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(
        CONVERSATION_ID,
        opusClip('audio/webm;codecs=opus'),
        'note.ogg',
      );
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    // The MIME is carried as the server returned it, AND the kind is the
    // server's AUDIO. A caller reading the MIME alone would send a video.
    expect(result.current.state).toEqual({
      kind: 'ready',
      assetId: ASSET_ID,
      mimeType: 'video/webm',
      assetKind: 'AUDIO',
    });
  });

  it.each([
    ['FILE', 'application/octet-stream'],
    ['', 'audio/ogg'],
    ['SOMETHING_NEW', 'audio/ogg'],
  ])(
    'names no sendable kind when the server answered kind %p',
    async (kind, mimeType) => {
      const { wrapper } = wrap([
        prepareMock(prepareInput(), 'audio/ogg'),
        finalizeMock({ kind, mimeType }),
      ]);

      stubFetch({ ok: true });

      const { result } = renderHook(() => useHermesWaMediaUpload(), {
        wrapper,
      });

      act(() => {
        result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
      });

      await waitFor(() => {
        expect(result.current.state.kind).toBe('ready');
      });

      expect(result.current.state).toMatchObject({ assetKind: null });
    },
  );

  it('names no sendable kind when the server published none at all', async () => {
    const { wrapper } = wrap([
      prepareMock(prepareInput(), 'audio/ogg'),
      finalizeMock({ kind: null }),
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    expect(result.current.state).toMatchObject({ assetKind: null });
  });

  // READY is the server's decision. A finalize that answered anything else has
  // not produced a sendable asset, whatever else it returned.
  it.each(['PENDING', 'ATTACHED', 'REVOKED', 'ready-ish'])(
    'does not call an asset ready when finalize answered %s',
    async (status) => {
      const { wrapper, operationNames } = wrap([
        prepareMock(prepareInput(), 'audio/ogg'),
        finalizeMock({ status }),
      ]);

      stubFetch({ ok: true });

      const { result } = renderHook(() => useHermesWaMediaUpload(), {
        wrapper,
      });

      act(() => {
        result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
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
          variables: prepareInput(),
        },
        result: {
          errors: [
            { message: 'MEDIA_NOT_ALLOWED', extensions: { code: 'FORBIDDEN' } },
          ],
        },
      },
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('denied');
    });
  });

  it('fails without a ready asset when the quarantine PUT is rejected', async () => {
    const { wrapper, operationNames } = wrap([
      prepareMock(prepareInput(), 'audio/ogg'),
    ]);

    stubFetch({ ok: false, status: 413 });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
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
      prepareMock(prepareInput(), 'audio/ogg'),
      finalizeMock(),
      {
        request: {
          query: HERMES_WA_CANCEL_MEDIA_UPLOAD,
          variables: {
            input: { conversationId: CONVERSATION_ID, assetId: ASSET_ID },
          },
        },
        result: {
          data: {
            hermesCancelMediaUpload: { id: ASSET_ID, status: 'REVOKED' },
          },
        },
      },
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
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
    expect(
      JSON.stringify(variablesOf('HermesWaCancelMediaUpload')),
    ).not.toContain(OTHER_CONVERSATION_ID);
  });

  it('offers no cancel before anything has been prepared', () => {
    const { wrapper } = wrap([]);

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    expect(result.current.cancel).toBeNull();
  });
});

// CATWA005. Two attempts that overlap must never leave the preview of one
// beside the asset id of the other: that sends the wrong bytes to a customer
// under a preview the operator trusted.
describe('useHermesWaMediaUpload — overlapping attempts', () => {
  const imagePrepareInput = {
    input: {
      conversationId: CONVERSATION_ID,
      kind: 'IMAGE',
      filename: 'devis.jpg',
      mimeType: 'image/jpeg',
      size: 4096,
    },
  };

  const imageClip = () =>
    new Blob([new Uint8Array(4096)], { type: 'image/jpeg' });

  const imageFinalize = () =>
    finalizeMock({
      assetId: SECOND_ASSET_ID,
      kind: 'IMAGE',
      mimeType: 'image/jpeg',
      filename: 'devis.jpg',
    });

  it('holds a lock, so a second upload cannot start while one is in flight', async () => {
    const { wrapper, variablesOf } = wrap([
      // Still on the wire when the second attempt is made.
      prepareMock(prepareInput(), 'audio/ogg', { delay: 60 }),
      finalizeMock(),
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    expect(result.current.state.kind).toBe('preparing');

    // The second attempt is refused by the lock and does not disturb the
    // first, which goes on showing its own real progress.
    act(() => {
      result.current.upload(CONVERSATION_ID, imageClip(), 'devis.jpg');
    });

    expect(result.current.state.kind).toBe('preparing');

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    // Only the audio attempt ever reached the server.
    expect(variablesOf('HermesWaPrepareMediaUpload')).toEqual([prepareInput()]);
    expect(result.current.state).toEqual({
      kind: 'ready',
      assetId: ASSET_ID,
      mimeType: 'audio/ogg',
      assetKind: 'AUDIO',
    });
  });

  // The inversion, deliberately: the attempt that STARTED first RESOLVES last.
  // Only this ordering catches the bug.
  it('discards a superseded attempt that resolves after the one replacing it', async () => {
    const { wrapper } = wrap([
      // Audio: started first, answered last.
      prepareMock(prepareInput(), 'audio/ogg', { delay: 120 }),
      finalizeMock(),
      // Image: started second, answered immediately.
      prepareMock(imagePrepareInput, 'image/jpeg', {
        assetId: SECOND_ASSET_ID,
        uploadUrl: SECOND_UPLOAD_URL,
      }),
      imageFinalize(),
    ]);

    const { calls } = stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    expect(result.current.state.kind).toBe('preparing');

    // The operator abandons it, which frees the lock. The audio attempt is now
    // superseded, but its prepare is still in flight.
    act(() => {
      result.current.reset();
    });

    act(() => {
      result.current.upload(CONVERSATION_ID, imageClip(), 'devis.jpg');
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        kind: 'ready',
        assetId: SECOND_ASSET_ID,
        mimeType: 'image/jpeg',
        assetKind: 'IMAGE',
      });
    });

    // Now the superseded answer lands. It must change nothing.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    });

    expect(result.current.state).toEqual({
      kind: 'ready',
      assetId: SECOND_ASSET_ID,
      mimeType: 'image/jpeg',
      assetKind: 'IMAGE',
    });

    // And it never pushed its bytes: only the surviving attempt's PUT ran.
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain(SECOND_UPLOAD_URL);
    expect(calls.every((call) => !call.url.includes(UPLOAD_URL))).toBe(true);
  });

  it('lets a new upload start once the previous attempt has settled', async () => {
    const { wrapper, variablesOf } = wrap([
      prepareMock(prepareInput(), 'audio/ogg'),
      finalizeMock(),
      prepareMock(imagePrepareInput, 'image/jpeg', {
        assetId: SECOND_ASSET_ID,
        uploadUrl: SECOND_UPLOAD_URL,
      }),
      imageFinalize(),
    ]);

    stubFetch({ ok: true });

    const { result } = renderHook(() => useHermesWaMediaUpload(), { wrapper });

    act(() => {
      result.current.upload(CONVERSATION_ID, opusClip(), 'note.ogg');
    });

    await waitFor(() => {
      expect(result.current.state.kind).toBe('ready');
    });

    act(() => {
      result.current.reset();
    });

    act(() => {
      result.current.upload(CONVERSATION_ID, imageClip(), 'devis.jpg');
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        kind: 'ready',
        assetId: SECOND_ASSET_ID,
        mimeType: 'image/jpeg',
        assetKind: 'IMAGE',
      });
    });

    expect(variablesOf('HermesWaPrepareMediaUpload')).toEqual([
      prepareInput(),
      imagePrepareInput,
    ]);
  });
});
