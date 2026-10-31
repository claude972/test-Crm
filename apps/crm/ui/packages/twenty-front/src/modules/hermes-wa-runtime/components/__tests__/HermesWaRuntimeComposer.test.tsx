import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';

import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';

import { HermesWaRuntimeComposer } from '@/hermes-wa-runtime/components/HermesWaRuntimeComposer';
import {
  HERMES_WA_FINALIZE_MEDIA_UPLOAD,
  HERMES_WA_PREPARE_MEDIA_UPLOAD,
} from '@/hermes-wa-runtime/graphql/metadata-mutations/hermesWaMediaUpload';
import { buildHermesWaOggOpusBytes } from '@/hermes-wa-runtime/hooks/__tests__/hermesWaOggOpusFixture';
import { useHermesWaReply } from '@/hermes-wa-runtime/hooks/useHermesWaReply';

// CATWA006, end to end through the composer. The server validates the asset
// kind at finalize; the MIME is not the verdict. An Opus stream the native
// sniff reported as `video/webm` is AUDIO on the server, and the composer used
// to read the MIME and send VIDEO — which the server refuses, so the voice
// note never arrived.
//
// ISOLATED DOUBLES. No microphone, no recorder, no provider: the file is a
// valid Ogg/Opus header stream built in this repository, the quarantine target
// is a stubbed fetch and every GraphQL answer is a fixture.

const CONVERSATION_ID = '8ab4f1c2-9d53-4e6a-b17c-c284a1b2c009';
const ASSET_ID = '9bc502d3-ae64-4f7b-c28d-d395b2c3d010';
const UPLOAD_URL = '/rest/hermes/media/quarantine/9bc502d3?token=short-lived';

const openConnection: MessagingInboxConnectionRead = {
  kind: 'reported',
  connection: {
    channel: 'WHATSAPP',
    unknownChannel: null,
    state: 'AVAILABLE',
    unknownState: null,
    canSend: true,
    canSync: true,
    canSendMedia: true,
    canReceiveMedia: true,
    canRecordVoice: true,
    canComposeRichEmail: false,
    lastCheckedAt: '2026-10-31T09:00:00.000Z',
    errorCode: null,
  },
};

// A file whose declared type is the recorder's parameterised WebM/Opus, whose
// bytes are a real Ogg/Opus header stream, and which the server finalizes as
// AUDIO while reporting `video/webm`.
const buildOpusFile = () =>
  new File([buildHermesWaOggOpusBytes()], 'note.webm', {
    type: 'audio/webm;codecs=opus',
  });

const prepareMock = (size: number): MockedResponse => ({
  request: {
    query: HERMES_WA_PREPARE_MEDIA_UPLOAD,
    variables: {
      input: {
        conversationId: CONVERSATION_ID,
        kind: 'AUDIO',
        filename: 'note.webm',
        mimeType: 'audio/webm',
        size,
      },
    },
  },
  result: {
    data: {
      hermesPrepareMediaUpload: {
        assetId: ASSET_ID,
        uploadUrl: UPLOAD_URL,
        contentType: 'audio/webm',
        expiresAt: '2026-10-31T09:01:00.000Z',
      },
    },
  },
});

const finalizeMock = (size: number): MockedResponse => ({
  request: {
    query: HERMES_WA_FINALIZE_MEDIA_UPLOAD,
    variables: {
      input: { conversationId: CONVERSATION_ID, assetId: ASSET_ID },
    },
  },
  result: {
    data: {
      hermesFinalizeMediaUpload: {
        id: ASSET_ID,
        // The server's verdict: AUDIO, despite the container the sniff saw.
        kind: 'AUDIO',
        filename: 'note.webm',
        mimeType: 'video/webm',
        size,
        status: 'READY',
      },
    },
  },
});

const Harness = () => {
  const reply = useHermesWaReply();

  return (
    <HermesWaRuntimeComposer
      conversationId={CONVERSATION_ID}
      connectionRead={openConnection}
      reply={reply}
    />
  );
};

const originalFetch = globalThis.fetch;

// jsdom has no object URL support, and the preview panel makes one. The stubs
// stay in place for the whole file: restoring them per test would break
// React's unmount cleanup, which runs after the test's own hooks.
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
  URL.createObjectURL = (() => 'blob:mock/preview') as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const renderComposer = (mocks: MockedResponse[]) => {
  const operations: Operation[] = [];

  const recordingLink = new ApolloLink((operation, forward) => {
    operations.push(operation);

    return forward(operation);
  });

  render(
    <Provider store={createStore()}>
      <I18nProvider i18n={i18n}>
        <MockedProvider
          link={ApolloLink.from([recordingLink, new MockLink(mocks)])}
        >
          <Harness />
        </MockedProvider>
      </I18nProvider>
    </Provider>,
  );

  return {
    operationNames: () => operations.map((each) => each.operationName),
    variablesOf: (name: string) =>
      operations
        .filter((each) => each.operationName === name)
        .map((each) => each.variables),
  };
};

describe('HermesWaRuntimeComposer — the reply kind of an uploaded asset', () => {
  it('sends AUDIO on the server’s verdict even though the MIME says video', async () => {
    const file = buildOpusFile();
    const size = file.size;

    const { operationNames, variablesOf } = renderComposer([
      prepareMock(size),
      finalizeMock(size),
    ]);

    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([])),
      } as unknown as Response),
    ) as unknown as typeof fetch;

    // `accept` is a picker hint listing bare types, so it excludes the
    // parameterised type a recorder reports. The verdict, not the attribute,
    // is what is under test here.
    const user = userEvent.setup({ applyAccept: false });

    // Nothing has been sent or prepared at mount.
    expect(operationNames()).toEqual([]);

    await user.upload(screen.getByLabelText(/choose a file/i), file);

    // Choosing a file is not uploading it either.
    expect(operationNames()).toEqual([]);

    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    // Upload runs; sending is still a separate, human step.
    await waitFor(() => {
      expect(operationNames()).toContain('HermesWaFinalizeMediaUpload');
    });

    expect(operationNames()).not.toContain('HermesWaReplyV3');

    // The asset is ready in the workspace and still unsent: the send is a
    // separate press, which is what this button appearing means.
    const sendButton = await screen.findByRole('button', {
      name: /send the attachment/i,
    });

    expect(operationNames()).not.toContain('HermesWaReplyV3');

    await user.click(sendButton);

    await waitFor(() => {
      expect(operationNames()).toContain('HermesWaReplyV3');
    });

    const [variables] = variablesOf('HermesWaReplyV3');
    const input = (variables as { input: Record<string, unknown> }).input;

    // The whole point: AUDIO, from the server's validated kind.
    expect(input.kind).toBe('AUDIO');
    expect(input.kind).not.toBe('VIDEO');
    expect(input.assetId).toBe(ASSET_ID);
    expect(input.conversationId).toBe(CONVERSATION_ID);
    // A voice note carries no caption, as the contract requires.
    expect(input.text).toBe('');
  });
});
