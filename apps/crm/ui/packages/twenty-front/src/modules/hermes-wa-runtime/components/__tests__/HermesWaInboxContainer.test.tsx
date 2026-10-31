import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import { HERMES_MESSAGING_CONNECTIONS } from '@/messaging-inbox/graphql/metadata-queries/hermesMessagingConnections';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';

import { HermesWaInboxContainer } from '@/hermes-wa-runtime/components/HermesWaInboxContainer';
import { HERMES_WA_CONVERSATIONS } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaConversations';
import { HERMES_WA_MESSAGES_V3 } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaMessagesV3';

const CONVERSATION_ID = '1f2cf1b4-2c1b-4f3a-9d1a-6a52b2f0c001';
const MESSAGE_ID = '1f2cf1b4-2c1b-4f3a-9d1a-6a52b2f0c002';
const ASSET_ID = '1f2cf1b4-2c1b-4f3a-9d1a-6a52b2f0c003';
const PHONE = '+33600000001';

const conversationsMock = {
  request: {
    query: HERMES_WA_CONVERSATIONS,
    variables: { input: { channel: 'WHATSAPP', limit: 30 } },
  },
  result: {
    data: {
      hermesInboxConversations: {
        items: [
          {
            id: CONVERSATION_ID,
            channel: 'WHATSAPP',
            providerConnectionId: null,
            contactHandle: PHONE,
            personId: null,
            personMatchStatus: 'UNMATCHED',
            subject: null,
            lastMessageAt: '2026-10-29T09:12:00.000Z',
            botMode: 'MANUAL',
            botModeUpdatedAt: null,
          },
        ],
        nextCursor: null,
      },
    },
  },
};

const messagesMock = {
  request: {
    query: HERMES_WA_MESSAGES_V3,
    variables: { input: { conversationId: CONVERSATION_ID, limit: 50 } },
  },
  result: {
    data: {
      hermesInboxMessagesV3: {
        items: [
          {
            id: MESSAGE_ID,
            conversationId: CONVERSATION_ID,
            channel: 'WHATSAPP',
            direction: 'INBOUND',
            // A received image may have empty text, which the contract names
            // outright. The attachment is the message.
            text: null,
            status: 'RECEIVED',
            occurredAt: '2026-10-29T09:12:00.000Z',
            errorCode: null,
            providerMessageId: null,
            kind: 'IMAGE',
            attachments: [
              {
                id: ASSET_ID,
                kind: 'IMAGE',
                filename: 'devis.jpg',
                mimeType: 'image/jpeg',
                size: 48123,
                status: 'ATTACHED',
              },
            ],
          },
        ],
        nextCursor: null,
      },
    },
  },
};

// The connection answers with every capability closed, which is the state the
// contract publishes until a real probe demonstrates otherwise.
const connectionsMock = {
  request: { query: HERMES_MESSAGING_CONNECTIONS },
  result: {
    data: {
      hermesMessagingConnections: [
        {
          channel: 'WHATSAPP',
          state: 'CONFIGURED_UNVERIFIED',
          canSend: false,
          canSync: false,
          canSendMedia: false,
          canReceiveMedia: false,
          canRecordVoice: false,
          canComposeRichEmail: false,
          lastCheckedAt: '2026-10-29T09:00:00.000Z',
          errorCode: null,
        },
      ],
    },
  },
};

const botPolicyMock = {
  request: {
    query: HERMES_CONVERSATION_BOT_POLICY,
    variables: { input: { conversationId: CONVERSATION_ID } },
  },
  result: {
    data: {
      hermesConversationBotPolicy: {
        conversationId: CONVERSATION_ID,
        localMode: 'INHERIT',
        effectiveMode: 'OFF',
        reason: 'WORKSPACE_POLICY',
        revision: 'r'.repeat(64),
        canDraft: false,
        canAutoReply: false,
      },
    },
  },
};

const renderContainer = ({
  connections = connectionsMock,
  conversations = conversationsMock,
}: {
  // Deliberately loose: an override legitimately carries empty arrays, which a
  // `typeof` of the populated fixtures would refuse.
  connections?: MockedResponse;
  conversations?: MockedResponse;
} = {}) => {
  // Every operation the container runs is recorded on its way to the mock
  // link, which is how "nothing is emitted at mount" becomes an assertion
  // rather than a claim.
  const operations: Operation[] = [];

  const recordingLink = new ApolloLink((operation, forward) => {
    operations.push(operation);

    return forward(operation);
  });

  const link = ApolloLink.from([
    recordingLink,
    new MockLink([conversations, messagesMock, connections, botPolicyMock]),
  ]);

  render(
    <Provider store={createStore()}>
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <MockedProvider link={link}>
            <HermesWaInboxContainer />
          </MockedProvider>
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );

  return {
    operationNames: () =>
      operations.map((operation) => operation.operationName),
  };
};

describe('HermesWaInboxContainer', () => {
  it('renders the conversation list, opens a thread, and sends nothing at mount', async () => {
    const { operationNames } = renderContainer();

    // The list is read on mount — a read — and the conversation shows up.
    const handle = await screen.findByText(PHONE);

    expect(handle).toBeInTheDocument();

    // Nothing has been written. No reply, no prepare, no finalize, no cancel,
    // and no media read: every one of those waits for a person.
    const mountOperations = operationNames();

    expect(mountOperations).toContain('HermesWaConversations');
    expect(mountOperations).not.toContain('HermesWaReplyV3');
    expect(mountOperations).not.toContain('HermesWaPrepareMediaUpload');
    expect(mountOperations).not.toContain('HermesWaFinalizeMediaUpload');
    expect(mountOperations).not.toContain('HermesWaCancelMediaUpload');
    expect(mountOperations).not.toContain('HermesWaMediaRead');
    expect(mountOperations).not.toContain('HermesWaMessagesV3');

    // Until a conversation is opened, there is no thread.
    expect(screen.getByText(/open a conversation to read it/i)).toBeVisible();

    // A human opens the thread.
    const entry = handle.closest('button');

    expect(entry).not.toBeNull();

    await userEvent.click(entry as HTMLButtonElement);

    // Now, and only now, the thread is read.
    await waitFor(() => {
      expect(operationNames()).toContain('HermesWaMessagesV3');
    });

    expect(
      await screen.findByRole('region', { name: /whatsapp conversation/i }),
    ).toBeInTheDocument();

    // The attachment is present and its bytes are NOT fetched. The library's
    // own "not loaded" state is the proof: it is what it renders when no
    // source has been resolved, and loading is offered as a separate step
    // because it needs an authorised request.
    expect(
      await screen.findByText(/attachment not loaded/i),
    ).toBeInTheDocument();
    expect(operationNames()).not.toContain('HermesWaMediaRead');

    // Opening a thread is still not a send.
    const afterOpening = operationNames();

    expect(afterOpening).not.toContain('HermesWaReplyV3');
    expect(afterOpening).not.toContain('HermesWaPrepareMediaUpload');
    expect(afterOpening).not.toContain('HermesWaFinalizeMediaUpload');
    expect(afterOpening).not.toContain('HermesWaCancelMediaUpload');
  });
  it('says the channel is not set up instead of inviting the operator to open a conversation that cannot exist', async () => {
    // No registered WhatsApp connection and no conversation: the screen used
    // to show only "Open a conversation to read it.", which reads as a working
    // but empty inbox. The configuration state has to be said here too.
    renderContainer({
      connections: {
        request: { query: HERMES_MESSAGING_CONNECTIONS },
        result: { data: { hermesMessagingConnections: [] } },
      },
      conversations: {
        request: conversationsMock.request,
        result: {
          data: {
            hermesInboxConversations: {
              ...conversationsMock.result.data.hermesInboxConversations,
              items: [],
            },
          },
        },
      },
    });

    expect(
      await screen.findByText(/not set up/i),
    ).toBeInTheDocument();
  });
});
