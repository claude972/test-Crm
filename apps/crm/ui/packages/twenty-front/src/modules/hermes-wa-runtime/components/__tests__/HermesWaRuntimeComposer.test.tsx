import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const SECOND_ASSET_ID = 'ace613e4-bf75-4a8c-d39e-e4a6c3d4e011';
const SECOND_UPLOAD_URL =
  '/rest/hermes/media/quarantine/ace613e4?token=short-lived';

const imageFile = () =>
  new File([new Uint8Array(4096)], 'devis.jpg', { type: 'image/jpeg' });

const imagePrepareMock = (): MockedResponse => ({
  request: {
    query: HERMES_WA_PREPARE_MEDIA_UPLOAD,
    variables: {
      input: {
        conversationId: CONVERSATION_ID,
        kind: 'IMAGE',
        filename: 'devis.jpg',
        mimeType: 'image/jpeg',
        size: 4096,
      },
    },
  },
  result: {
    data: {
      hermesPrepareMediaUpload: {
        assetId: SECOND_ASSET_ID,
        uploadUrl: SECOND_UPLOAD_URL,
        contentType: 'image/jpeg',
        expiresAt: '2026-10-31T09:01:00.000Z',
      },
    },
  },
});

const imageFinalizeMock = (): MockedResponse => ({
  request: {
    query: HERMES_WA_FINALIZE_MEDIA_UPLOAD,
    variables: {
      input: { conversationId: CONVERSATION_ID, assetId: SECOND_ASSET_ID },
    },
  },
  result: {
    data: {
      hermesFinalizeMediaUpload: {
        id: SECOND_ASSET_ID,
        kind: 'IMAGE',
        filename: 'devis.jpg',
        mimeType: 'image/jpeg',
        size: 4096,
        status: 'READY',
      },
    },
  },
});

const prepareMock = (size: number, delay?: number): MockedResponse => ({
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
  ...(delay === undefined ? {} : { delay }),
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
  URL.createObjectURL = (() =>
    'blob:mock/preview') as typeof URL.createObjectURL;
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

// CATWA005, at the layer where the claim is made. The upload hook's own lock
// made the hook internally consistent, but nothing bound the panel's displayed
// file to the asset Send transmitted — so this is driven through the real
// composer and its real preview panel, which is exactly why a passing hook
// suite did not catch it.
describe('HermesWaRuntimeComposer — displayed file versus transmitted asset', () => {
  const stubOk = () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([])),
      } as unknown as Response),
    ) as unknown as typeof fetch;
  };

  it('does not offer Send when the prepared asset is not the file on screen', async () => {
    const audio = buildOpusFile();

    const { operationNames, variablesOf } = renderComposer([
      // The audio prepare is slow, so a second file can be chosen while it is
      // still in flight. This is root's reproduction, in order.
      prepareMock(audio.size, 120),
      finalizeMock(audio.size),
      imagePrepareMock(),
      imageFinalizeMock(),
    ]);

    stubOk();

    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/choose a file/i);

    // A is chosen and its upload is started.
    await user.upload(input, audio);
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    // B is chosen while A is still uploading. The panel now shows B.
    await user.upload(input, imageFile());

    expect(screen.getByText(/devis\.jpg/)).toBeVisible();

    // A finishes and becomes ready in the workspace.
    await screen.findByText(/ready in the workspace/i);

    // The mismatch is stated, and Send is simply not there.
    expect(await screen.findByText(/not the file now selected/i)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /send the attachment/i }),
    ).not.toBeInTheDocument();

    // Nothing was transmitted at all, least of all A under B's preview.
    expect(operationNames()).not.toContain('HermesWaReplyV3');
    expect(variablesOf('HermesWaReplyV3')).toEqual([]);

    // The prepared asset is still the operator's to revoke.
    expect(
      screen.getByRole('button', { name: /discard the draft attachment/i }),
    ).toBeVisible();
  });

  it('sends the file on screen once that file is the one prepared', async () => {
    const audio = buildOpusFile();

    const { variablesOf } = renderComposer([
      prepareMock(audio.size, 120),
      finalizeMock(audio.size),
      imagePrepareMock(),
      imageFinalizeMock(),
    ]);

    stubOk();

    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/choose a file/i);

    await user.upload(input, audio);
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    const image = imageFile();

    await user.upload(input, image);
    await screen.findByText(/not the file now selected/i);

    // The operator uploads what is actually on screen. Identities agree again.
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    const sendButton = await screen.findByRole('button', {
      name: /send the attachment/i,
    });

    expect(
      screen.queryByText(/not the file now selected/i),
    ).not.toBeInTheDocument();

    await user.click(sendButton);

    await waitFor(() => {
      expect(variablesOf('HermesWaReplyV3')).toHaveLength(1);
    });

    const [variables] = variablesOf('HermesWaReplyV3');
    const sent = (variables as { input: Record<string, unknown> }).input;

    // The asset transmitted is the one built from the displayed file, and the
    // superseded audio asset is nowhere near it.
    expect(sent.assetId).toBe(SECOND_ASSET_ID);
    expect(sent.assetId).not.toBe(ASSET_ID);
    expect(sent.kind).toBe('IMAGE');
  });

  it('withdraws Send when the selection is cleared under a prepared asset', async () => {
    const audio = buildOpusFile();

    const { operationNames } = renderComposer([
      prepareMock(audio.size),
      finalizeMock(audio.size),
    ]);

    stubOk();

    const user = userEvent.setup({ applyAccept: false });

    await user.upload(screen.getByLabelText(/choose a file/i), audio);
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );

    // With the file still on screen, Send is offered.
    expect(
      await screen.findByRole('button', { name: /send the attachment/i }),
    ).toBeVisible();

    // The operator clears the selection. There is now nothing on screen that
    // the prepared asset corresponds to.
    await user.click(screen.getAllByRole('button', { name: /^cancel$/i })[0]);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /send the attachment/i }),
      ).not.toBeInTheDocument();
    });

    expect(operationNames()).not.toContain('HermesWaReplyV3');
  });
});

describe('HermesWaRuntimeComposer — rejected selection never owns an asset', () => {
  it('keeps A unsendable after choosing and submitting B while A is locked', async () => {
    const audio = buildOpusFile();
    const { operationNames, variablesOf } = renderComposer([
      prepareMock(audio.size),
      { ...finalizeMock(audio.size), delay: 1000 },
      imagePrepareMock(),
      imageFinalizeMock(),
    ]);
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/choose a file/i);
    await user.upload(input, audio);
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );
    await waitFor(() =>
      expect(operationNames()).toContain('HermesWaFinalizeMediaUpload'),
    );
    await user.upload(input, imageFile());
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );
    expect(screen.getByText('devis.jpg')).toBeVisible();
    await screen.findByText(/not the file now selected/i);
    expect(variablesOf('HermesWaPrepareMediaUpload')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: /send the attachment/i }),
    ).not.toBeInTheDocument();
    expect(variablesOf('HermesWaReplyV3')).toEqual([]);

    // A settled; a new human request may now prepare and send B itself.
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /send the attachment/i }),
    );
    await waitFor(() => expect(variablesOf('HermesWaReplyV3')).toHaveLength(1));
    expect(variablesOf('HermesWaReplyV3')[0]).toMatchObject({
      input: { assetId: SECOND_ASSET_ID },
    });
  });

  it('withdraws A immediately when B is selected after A is already ready', async () => {
    const audio = buildOpusFile();
    const { variablesOf } = renderComposer([
      prepareMock(audio.size),
      finalizeMock(audio.size),
    ]);
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/choose a file/i);
    await user.upload(input, audio);
    await user.click(
      screen.getByRole('button', { name: /send this attachment/i }),
    );
    await screen.findByRole('button', { name: /send the attachment/i });
    await user.upload(input, imageFile());
    expect(screen.getByText('devis.jpg')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /send the attachment/i }),
    ).not.toBeInTheDocument();
    expect(variablesOf('HermesWaReplyV3')).toEqual([]);
    expect(
      screen.getByRole('button', { name: /discard the draft attachment/i }),
    ).toBeVisible();
  });
});

// Only browser capture is doubled; the recorder, file panel, composer and upload hook are real.
class IdentityMediaRecorderStub extends EventTarget {
  state = 'inactive';
  mimeType = 'audio/ogg';
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    const event = new Event('dataavailable');
    Object.assign(event, {
      data: new Blob([buildHermesWaOggOpusBytes()], { type: 'audio/ogg' }),
    });
    this.dispatchEvent(event);
    this.dispatchEvent(new Event('stop'));
  }
}

describe('HermesWaRuntimeComposer — file and recorded clip identity', () => {
  const originalMediaRecorder = window.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;
  const originalSecureContext = window.isSecureContext;
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: IdentityMediaRecorderStub,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(async () => ({
          getTracks: () => [{ stop: jest.fn() }],
        })),
      },
    });
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;
  });
  afterEach(() => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecureContext,
    });
  });

  it.each(['send the accepted clip', 'record again'] as const)(
    '%s without reusing the previously displayed asset',
    async (action) => {
      const size = buildHermesWaOggOpusBytes().length;
      const voicePrepare = prepareMock(size);
      voicePrepare.request.variables = {
        input: {
          conversationId: CONVERSATION_ID,
          kind: 'AUDIO',
          filename: 'voice-note',
          mimeType: 'audio/ogg',
          size,
        },
      };
      const { operationNames, variablesOf } = renderComposer([
        imagePrepareMock(),
        { ...imageFinalizeMock(), delay: 1000 },
        voicePrepare,
        finalizeMock(size),
      ]);
      const user = userEvent.setup({ applyAccept: false });
      await user.upload(screen.getByLabelText(/choose a file/i), imageFile());
      await user.click(
        screen.getByRole('button', { name: /send this attachment/i }),
      );
      await waitFor(() =>
        expect(operationNames()).toContain('HermesWaFinalizeMediaUpload'),
      );
      await user.click(screen.getByRole('button', { name: /^record$/i }));
      await user.click(await screen.findByRole('button', { name: /^stop$/i }));
      await user.click(
        screen.getByRole('button', { name: /send this voice message/i }),
      );
      await screen.findByText(/not the file now selected/i);
      expect(variablesOf('HermesWaPrepareMediaUpload')).toHaveLength(1);
      expect(
        screen.queryByRole('button', { name: /send the attachment/i }),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: /send this voice message/i }),
      );
      const send = await screen.findByRole('button', {
        name: /send the attachment/i,
      });
      if (action === 'record again') {
        await user.click(screen.getByRole('button', { name: /record again/i }));
        expect(
          screen.queryByRole('button', { name: /send the attachment/i }),
        ).not.toBeInTheDocument();
        expect(variablesOf('HermesWaReplyV3')).toEqual([]);
        await user.click(
          within(
            screen.getByRole('region', { name: /voice message/i }),
          ).getByRole('button', { name: /^cancel$/i }),
        );
        expect(
          screen.queryByRole('button', { name: /send the attachment/i }),
        ).not.toBeInTheDocument();
      } else {
        await user.click(send);
        await waitFor(() =>
          expect(variablesOf('HermesWaReplyV3')).toHaveLength(1),
        );
        expect(variablesOf('HermesWaReplyV3')[0]).toMatchObject({
          input: { assetId: ASSET_ID, kind: 'AUDIO' },
        });
      }
    },
  );
});
