import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';

import { HERMES_MCP_TOOL_SURFACE } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesMcpToolSurface';
import { HermesMailboxRuntimeBotPanel } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntimeBotPanel';
import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';

// R09 asks for the bot to be stoppable per WhatsApp conversation AND per mail
// thread. Both mount the same control, so this suite is the mail front door's
// own proof that the shared mechanism still serves it.
//
// ISOLATED DOUBLES: no MCP server is connected in this mission. Every answer
// here is a fixture.

const CONVERSATION_ID = '3b8d02e5-4c2f-4a3b-9d2b-6b52c3f1e002';
const REVISION = 'c3'.repeat(32);

const mailPolicy = (overrides: Record<string, unknown> = {}) => ({
  conversationId: CONVERSATION_ID,
  localMode: 'ASSISTED',
  effectiveMode: 'ASSISTED',
  reason: 'LOCAL_POLICY',
  revision: REVISION,
  canDraft: true,
  canAutoReply: false,
  ...overrides,
});

const policyRead = (value: Record<string, unknown>): MockedResponse => ({
  request: {
    query: HERMES_CONVERSATION_BOT_POLICY,
    variables: { input: { conversationId: CONVERSATION_ID } },
  },
  result: { data: { hermesConversationBotPolicy: value } },
});

const readySurface: MockedResponse = {
  request: { query: HERMES_MCP_TOOL_SURFACE },
  result: {
    data: {
      hermesMcpToolSurface: {
        status: 'READY',
        checkedAt: '2026-10-31T09:00:00.000Z',
        errorCode: null,
        authorizedTools: ['draft_reply'],
        draftingTool: 'draft_reply',
        truncated: false,
        tools: [
          {
            name: 'draft_reply',
            title: 'Draft a reply',
            authorized: true,
            callable: true,
            refusals: [],
            isDraftingTool: true,
          },
        ],
      },
    },
  },
};

const renderPanel = (
  conversationId: string | null,
  mocks: MockedResponse[],
) => {
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
          <HermesMailboxRuntimeBotPanel conversationId={conversationId} />
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

describe('HermesMailboxRuntimeBotPanel', () => {
  it('stops the bot on a mail thread and reads the mode back from the server', async () => {
    const off = mailPolicy({
      localMode: 'OFF',
      effectiveMode: 'OFF',
      canDraft: false,
    });

    const { variablesOf } = renderPanel(CONVERSATION_ID, [
      policyRead(mailPolicy()),
      readySurface,
      {
        request: {
          query: HERMES_SET_CONVERSATION_BOT_POLICY,
          variables: {
            input: {
              conversationId: CONVERSATION_ID,
              mode: 'OFF',
              expectedRevision: REVISION,
            },
          },
        },
        result: { data: { hermesSetConversationBotPolicy: off } },
      },
      policyRead(off),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /stop the bot/i }),
    );

    expect(await screen.findByText(/bot stopped/i)).toBeVisible();

    // OFF is a restriction and carries no grant, on mail as on WhatsApp.
    expect(variablesOf('HermesSetConversationBotPolicy')).toEqual([
      {
        input: {
          conversationId: CONVERSATION_ID,
          mode: 'OFF',
          expectedRevision: REVISION,
        },
      },
    ]);
  });

  it('offers the same explicit two-step AUTO delegation on a mail thread', async () => {
    const { operationNames, variablesOf } = renderPanel(CONVERSATION_ID, [
      policyRead(mailPolicy()),
      readySurface,
      {
        request: {
          query: HERMES_SET_CONVERSATION_BOT_POLICY,
          variables: {
            input: {
              conversationId: CONVERSATION_ID,
              mode: 'AUTO',
              expectedRevision: REVISION,
              delegateAuto: true,
            },
          },
        },
        result: {
          data: {
            hermesSetConversationBotPolicy: mailPolicy({
              localMode: 'AUTO',
              effectiveMode: 'AUTO',
              canAutoReply: true,
            }),
          },
        },
      },
      policyRead(
        mailPolicy({
          localMode: 'AUTO',
          effectiveMode: 'AUTO',
          canAutoReply: true,
        }),
      ),
    ]);

    await userEvent.click(
      await screen.findByRole('button', {
        name: /let the bot reply on its own/i,
      }),
    );

    // Still two presses on mail: the first one wrote nothing.
    expect(operationNames()).not.toContain('HermesSetConversationBotPolicy');

    await userEvent.click(
      screen.getByRole('button', { name: /confirm automatic replies/i }),
    );

    await waitFor(() => {
      expect(variablesOf('HermesSetConversationBotPolicy')).toEqual([
        {
          input: {
            conversationId: CONVERSATION_ID,
            mode: 'AUTO',
            expectedRevision: REVISION,
            delegateAuto: true,
          },
        },
      ]);
    });
  });

  it('addresses no policy at all when the server named no conversation', async () => {
    const { operationNames } = renderPanel(null, []);

    expect(
      await screen.findByText(/published no conversation for this message/i),
    ).toBeVisible();

    // No conversation means nothing to key a policy on, so neither the policy
    // nor the MCP discovery is read.
    expect(operationNames()).not.toContain('HermesConversationBotPolicy');
    expect(operationNames()).not.toContain('HermesMcpToolSurface');
  });
});
