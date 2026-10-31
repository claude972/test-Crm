import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';

import { HERMES_MCP_TOOL_SURFACE } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesMcpToolSurface';
import { MessagingInboxBotModeControl } from '@/messaging-inbox/components/MessagingInboxBotModeControl';
import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';
import { useMessagingInboxBotMode } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';

// ISOLATED DOUBLES. No Evolution provider and no MCP server is connected in
// this mission, so every answer below is a fixture standing in for one. These
// tests prove this product's wiring and its refusal handling; they prove
// nothing about a real provider.

const CONVERSATION_ID = '2a7c91d4-3b1e-4f2a-8c1a-5a41b2f0d001';
const REVISION = 'a1'.repeat(32);
const NEXT_REVISION = 'b2'.repeat(32);

const policy = (overrides: Record<string, unknown> = {}) => ({
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

// A surface whose drafting tool is granted and callable: two explicit yeses.
const readySurface = (
  overrides: Record<string, unknown> = {},
): MockedResponse => ({
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
        ...overrides,
      },
    },
  },
});

// A denial needs the GraphQL shape with its code. A bare `new Error(...)`
// would read as a transport failure, not as a refusal.
const setPolicyDenied = (
  message: string,
  code = 'CONFLICT',
): MockedResponse => ({
  request: {
    query: HERMES_SET_CONVERSATION_BOT_POLICY,
    variables: {
      input: {
        conversationId: CONVERSATION_ID,
        mode: 'INHERIT',
        expectedRevision: REVISION,
      },
    },
  },
  result: { errors: [{ message, extensions: { code } }] },
});

const Harness = () => {
  // The control takes the v1 control in its signature and deliberately does
  // not write through it. Calling the real hook keeps that wiring honest.
  const legacy = useMessagingInboxBotMode();

  return (
    <MessagingInboxBotModeControl
      conversationId={CONVERSATION_ID}
      reportedMode={null}
      control={legacy}
    />
  );
};

const renderControl = (mocks: MockedResponse[]) => {
  const operations: Operation[] = [];

  const recordingLink = new ApolloLink((operation, forward) => {
    operations.push(operation);

    return forward(operation);
  });

  const link = ApolloLink.from([recordingLink, new MockLink(mocks)]);

  const view = render(
    <Provider store={createStore()}>
      <I18nProvider i18n={i18n}>
        <MockedProvider link={link}>
          <Harness />
        </MockedProvider>
      </I18nProvider>
    </Provider>,
  );

  return {
    view,
    operationNames: () => operations.map((each) => each.operationName),
    variablesOf: (name: string) =>
      operations.filter((each) => each.operationName === name).map(
        (each) => each.variables,
      ),
  };
};

describe('MessagingInboxBotModeControl — the AUTO delegation path', () => {
  it('offers AUTO only behind an explicit confirmation, and sends the delegation', async () => {
    const { operationNames, variablesOf } = renderControl([
      policyRead(policy()),
      readySurface(),
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
            hermesSetConversationBotPolicy: policy({
              localMode: 'AUTO',
              effectiveMode: 'AUTO',
              revision: NEXT_REVISION,
              canAutoReply: true,
            }),
          },
        },
      },
      policyRead(
        policy({
          localMode: 'AUTO',
          effectiveMode: 'AUTO',
          revision: NEXT_REVISION,
          canAutoReply: true,
        }),
      ),
    ]);

    const open = await screen.findByRole('button', {
      name: /let the bot reply on its own/i,
    });

    // The first press has NOT delegated anything.
    await userEvent.click(open);

    expect(operationNames()).not.toContain('HermesSetConversationBotPolicy');

    // The consequence is written out before the second press.
    expect(
      screen.getByText(
        /will answer this customer by itself.*without anyone reading them first/is,
      ),
    ).toBeVisible();
    expect(screen.getByText(/draft_reply/)).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: /confirm automatic replies/i }),
    );

    await waitFor(() => {
      expect(operationNames()).toContain('HermesSetConversationBotPolicy');
    });

    // The delegation the contract requires travelled with it, and nothing
    // else did.
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

  it('backing out of the confirmation writes nothing at all', async () => {
    const { operationNames } = renderControl([
      policyRead(policy()),
      readySurface(),
    ]);

    await userEvent.click(
      await screen.findByRole('button', {
        name: /let the bot reply on its own/i,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: /keep the bot off this conversation/i,
      }),
    );

    expect(operationNames()).not.toContain('HermesSetConversationBotPolicy');
    expect(
      screen.queryByRole('button', { name: /confirm automatic replies/i }),
    ).not.toBeInTheDocument();
  });

  // Eligibility is read from the authority. An unknown answer withholds the
  // choice and must not read as a refusal.
  it('withholds the choice and says it is unknown when the authority did not answer', async () => {
    renderControl([
      policyRead(policy()),
      readySurface({
        tools: [
          {
            name: 'draft_reply',
            title: 'Draft a reply',
            authorized: true,
            // The server did not say. An empty refusal list is not a yes.
            callable: null,
            refusals: [],
            isDraftingTool: true,
          },
        ],
      }),
    ]);

    expect(
      await screen.findByText(/is unknown.*did not say whether its reply tool can be called/is),
    ).toBeVisible();
    expect(screen.getByText(/this is not a refusal/i)).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: /let the bot reply on its own/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('never offers the delegation when no bot server is configured', async () => {
    renderControl([
      policyRead(policy()),
      readySurface({ status: 'NOT_CONFIGURED', tools: [], draftingTool: null }),
    ]);

    expect(
      await screen.findByText(/no bot server is configured/i),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: /let the bot reply on its own/i,
      }),
    ).not.toBeInTheDocument();
  });

  // The hole this fixes: INHERIT can land on AUTO, which the server refuses
  // with BOT_DELEGATION_REQUIRED. The refusal has to be explained, and the
  // delegation must NOT be smuggled in under INHERIT.
  it('explains a delegation refusal on INHERIT instead of calling it a failure', async () => {
    const { operationNames, variablesOf } = renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_DELEGATION_REQUIRED'),
      policyRead(policy()),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    expect(
      await screen.findByText(/has to be chosen explicitly/i),
    ).toBeVisible();

    // Not shown as a technical failure.
    expect(screen.queryByText(/policy unchanged/i)).not.toBeInTheDocument();

    // And INHERIT did not carry the delegation.
    expect(variablesOf('HermesSetConversationBotPolicy')).toEqual([
      {
        input: {
          conversationId: CONVERSATION_ID,
          mode: 'INHERIT',
          expectedRevision: REVISION,
        },
      },
    ]);

    // This refusal leaves the held revision valid, so nothing is re-read:
    // only the mount read happened. A spare read mock is available above, so
    // a refetch would have been answered and counted here rather than hidden.
    expect(
      operationNames().filter((name) => name === 'HermesConversationBotPolicy'),
    ).toHaveLength(1);
  });

  // CATWA004. The STALE sentence tells the operator the policy has been read
  // again. Without an actual re-read the stale revision stays in hand and
  // every further attempt is refused identically — the sentence would be a
  // promise the code does not keep.
  it('re-reads the policy after a STALE refusal, as its message says it has', async () => {
    const { operationNames } = renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_POLICY_STALE'),
      // The re-read, answering with the revision that moved under the screen.
      policyRead(policy({ revision: NEXT_REVISION })),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    expect(await screen.findByText(/please choose once more/i)).toBeVisible();

    // Two reads of the policy: the one at mount and the one the refusal
    // triggered. Counting them is what separates a promise from a fact.
    await waitFor(() => {
      expect(
        operationNames().filter(
          (name) => name === 'HermesConversationBotPolicy',
        ),
      ).toHaveLength(2);
    });
  });

  // CATWA004, second half. The three outcomes of that re-read are three
  // renderings, never two overlapping ones. Promising "it has been read again"
  // over a read that failed told the operator the read had both failed and
  // succeeded, and gave them no way to try.
  it('says the re-read failed, and offers the retry, instead of claiming it succeeded', async () => {
    renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_POLICY_STALE'),
      // The re-read itself fails on the network. MockLink needs `error` for
      // this: a throw inside `result` is not a rejected request.
      {
        request: {
          query: HERMES_CONVERSATION_BOT_POLICY,
          variables: { input: { conversationId: CONVERSATION_ID } },
        },
        error: new Error('network down'),
      },
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    expect(
      await screen.findByText(/did not get through/i),
    ).toBeVisible();

    // The success sentence must NOT be on screen beside it.
    expect(
      screen.queryByText(/it has been read again/i),
    ).not.toBeInTheDocument();

    // Nor is the generic note duplicated beside the specific one: two notes
    // for one fact is how the contradiction read.
    expect(
      screen.queryByText(/replying by hand still works/i),
    ).not.toBeInTheDocument();

    // The retry exists, which is the only thing that can unblock them.
    expect(
      screen.getByRole('button', { name: /read the policy again/i }),
    ).toBeVisible();
  });

  it('claims the re-read succeeded only when it actually did', async () => {
    renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_POLICY_STALE'),
      policyRead(policy({ revision: NEXT_REVISION })),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    expect(await screen.findByText(/it has been read again/i)).toBeVisible();

    // No failure wording, and no retry: there is nothing to retry.
    expect(
      screen.queryByText(/cannot be made until it has been read/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/replying by hand still works/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /read the policy again/i }),
    ).not.toBeInTheDocument();
  });

  // A retry that is offered must work. Offering a button that cannot unblock
  // the operator would be the same defect wearing a different hat.
  it('the offered retry actually re-reads, and the wording follows the new outcome', async () => {
    const failingRead = {
      request: {
        query: HERMES_CONVERSATION_BOT_POLICY,
        variables: { input: { conversationId: CONVERSATION_ID } },
      },
      error: new Error('network down'),
    };

    const { operationNames } = renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_POLICY_STALE'),
      failingRead,
      // The retry's own read, which succeeds and brings the moved revision.
      policyRead(policy({ revision: NEXT_REVISION })),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    const retry = await screen.findByRole('button', {
      name: /read the policy again/i,
    });

    // Mount read plus the failed re-read.
    expect(
      operationNames().filter((name) => name === 'HermesConversationBotPolicy'),
    ).toHaveLength(2);

    await userEvent.click(retry);

    // The failure wording is gone, replaced by the outcome that really
    // happened, and the retry withdraws itself.
    expect(await screen.findByText(/it has been read again/i)).toBeVisible();
    expect(screen.queryByText(/did not get through/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /read the policy again/i }),
    ).not.toBeInTheDocument();

    // And a third read really went out.
    await waitFor(() => {
      expect(
        operationNames().filter(
          (name) => name === 'HermesConversationBotPolicy',
        ),
      ).toHaveLength(3);
    });
  });

  // Root's three cases. `data !== undefined` claimed a policy had been read on
  // the strength of the FIELD EXISTING — the same error as claiming a file was
  // uploaded on the strength of having asked. A container is not an answer.
  //
  // Each yields 'unreadable': the retry is offered, the success wording is
  // absent, and the generic note is not duplicated beside the specific one.
  it.each([
    ['null', null],
    ['malformed', 'not-an-object'],
    [
      'about another conversation',
      {
        conversationId: '00000000-0000-4000-8000-000000000999',
        localMode: 'ASSISTED',
        effectiveMode: 'ASSISTED',
        reason: 'LOCAL_POLICY',
        revision: NEXT_REVISION,
        canDraft: true,
        canAutoReply: false,
      },
    ],
  ])(
    'treats a re-read payload that is %s as unreadable, with the retry',
    async (_label, payload) => {
      renderControl([
        policyRead(policy()),
        readySurface(),
        setPolicyDenied('BOT_POLICY_STALE'),
        // No error at all: the request succeeded and carried this.
        {
          request: {
            query: HERMES_CONVERSATION_BOT_POLICY,
            variables: { input: { conversationId: CONVERSATION_ID } },
          },
          result: { data: { hermesConversationBotPolicy: payload } },
        },
      ]);

      await userEvent.click(
        await screen.findByRole('button', { name: /follow the company/i }),
      );

      expect(
        await screen.findByText(/could not be read as this conversation/i),
      ).toBeVisible();

      // Never "it has been read again" over a payload that was not a policy.
      expect(
        screen.queryByText(/it has been read again/i),
      ).not.toBeInTheDocument();

      // A failed request is a different fact and must not be claimed either.
      expect(
        screen.queryByText(/did not get through/i),
      ).not.toBeInTheDocument();

      // One note for one fact.
      expect(
        screen.queryByText(/replying by hand still works/i),
      ).not.toBeInTheDocument();

      // And the way forward exists.
      expect(
        screen.getByRole('button', { name: /read the policy again/i }),
      ).toBeVisible();
    },
  );

  it('offers no re-read retry for a refusal that called for no re-read', async () => {
    renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_DELEGATION_REQUIRED'),
      policyRead(policy()),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    await screen.findByText(/has to be chosen explicitly/i);

    expect(
      screen.queryByRole('button', { name: /read the policy again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/it has been read again/i),
    ).not.toBeInTheDocument();
  });

  it('explains a stricter company policy in its own terms', async () => {
    renderControl([
      policyRead(policy()),
      readySurface(),
      setPolicyDenied('BOT_POLICY_RESTRICTION'),
      policyRead(policy()),
    ]);

    await userEvent.click(
      await screen.findByRole('button', { name: /follow the company/i }),
    );

    expect(
      await screen.findByText(/stricter than that/i),
    ).toBeVisible();
  });
});

describe('MessagingInboxBotModeControl — OFF', () => {
  it('sends OFF without any delegation and shows the server-applied mode', async () => {
    const off = policy({
      localMode: 'OFF',
      effectiveMode: 'OFF',
      revision: NEXT_REVISION,
      canDraft: false,
      canAutoReply: false,
    });

    const { variablesOf } = renderControl([
      policyRead(policy()),
      readySurface(),
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

    // The label comes from the server's answer after the refetch, not from
    // the request that was made.
    expect(await screen.findByText(/bot stopped/i)).toBeVisible();
    expect(
      await screen.findByText(/no drafts on this conversation/i),
    ).toBeVisible();

    // `delegateAuto` is absent. OFF is a restriction, never a grant.
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

  it('offers no way to reach AUTO while the conversation is OFF-eligible but unconfirmed', async () => {
    renderControl([
      policyRead(
        policy({ localMode: 'OFF', effectiveMode: 'OFF', canDraft: false }),
      ),
      readySurface(),
    ]);

    await screen.findByText(/bot stopped/i);

    // The offer exists, but no single press reaches the delegation: the
    // confirm button is not on screen until a person asks for it.
    expect(
      screen.queryByRole('button', { name: /confirm automatic replies/i }),
    ).not.toBeInTheDocument();
  });

  // Reload: a fresh mount re-reads from the server, and what it shows is the
  // server's stored answer rather than anything this screen remembered.
  it('still shows OFF after a reload because it is read back from the server', async () => {
    const off = policy({
      localMode: 'OFF',
      effectiveMode: 'OFF',
      canDraft: false,
      canAutoReply: false,
    });

    const { view } = renderControl([policyRead(off), readySurface()]);

    expect(await screen.findByText(/bot stopped/i)).toBeVisible();

    view.unmount();

    renderControl([policyRead(off), readySurface()]);

    expect(await screen.findByText(/bot stopped/i)).toBeVisible();
  });
});
