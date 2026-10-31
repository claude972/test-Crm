import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';

import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import {
  clearHermesMailboxRuntimeDraftIdentities,
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX,
} from '@/hermes-mailbox-runtime/utils/hermesMailboxRuntimeDraftIdentities';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HermesMailboxRuntime } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntime';
import { HERMES_MAILBOX_RUNTIME_PAGE_SIZE } from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import { HERMES_MAIL_CLONE_ATTACHMENT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCloneAttachmentV4';
import { HERMES_MAIL_CREATE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCreateDraftV4';
import { HERMES_MAIL_PLAN_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailPlanV4';
import { HERMES_MAIL_SAVE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSaveDraftV4';
import { HERMES_MAIL_SEND_NEW_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendNewV4';
import { HERMES_MAIL_SEND_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendV4';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
import { HERMES_MAIL_FOLDERS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailFoldersV4';
import { HERMES_MAIL_MESSAGES_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessagesV4';
import { HERMES_MAIL_MESSAGE_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessageV4';
import { HERMES_INBOX_DRAFT_REPLY } from '@/messaging-inbox/graphql/metadata-mutations/hermesInboxDraftReply';
import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const ACCOUNT_ID = '11111111-2222-3333-4444-555555555555';
const OTHER_ACCOUNT_ID = '99999999-8888-7777-6666-555555555555';
const CONVERSATION_ID = '6f1d1f8e-3a2b-4c55-9f10-7d3b2a9c4e01';
// Two people and two companies. A draft identity belongs to exactly one pair
// of them, and the same mailbox address on both is the point.
const USER_A = { id: 'u5a1f0de-0001-4001-8001-aaaaaaaaaaaa' } as never;
const USER_B = { id: 'u5a1f0de-0002-4002-8002-bbbbbbbbbbbb' } as never;
const WORKSPACE_A = { id: 'w0a1f0de-0001-4001-8001-aaaaaaaaaaaa' } as never;
const WORKSPACE_B = { id: 'w0a1f0de-0002-4002-8002-bbbbbbbbbbbb' } as never;
const FORWARD_CONVERSATION_ID = '7a2e2f9f-4b3c-5d66-af21-8e4c3bad5f12';
const SOURCE_ASSET_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const CLONED_ASSET_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

// The central MAIL connection is the authority on which mailbox is bound. It
// names the authorised connected account; the native account is only kept
// because it matches that id.
const CONNECTIONS_PAYLOAD = [
  { kind: 'EVOLUTION', connectionId: null, revision: 0, state: 'NOT_CONFIGURED', settings: {} },
  {
    kind: 'MAIL',
    connectionId: 'c0ffee00-1111-4111-8111-c0ffee000001',
    revision: 7,
    state: 'CONFIGURED_UNVERIFIED',
    settings: {
      connectedAccountId: ACCOUNT_ID,
      mailbox: 'INBOX',
      handle: 'ops@kovaalab.test',
    },
  },
];

// The same binding after a rotation: same account, newer revision.
const ROTATED_CONNECTIONS_PAYLOAD = CONNECTIONS_PAYLOAD.map((entry) =>
  entry.kind === 'MAIL' ? { ...entry, revision: 8 } : entry,
);

// Two accounts, and the wrong one comes first on purpose: picking the first
// non-archived account is exactly the defect these tests guard against.
const CONNECTED_ACCOUNTS = [
  {
    id: OTHER_ACCOUNT_ID,
    handle: 'sales@kovaalab.test',
    handleAliases: [],
    archivedAt: null,
  },
  {
    id: ACCOUNT_ID,
    handle: 'ops@kovaalab.test',
    handleAliases: ['billing@kovaalab.test'],
    archivedAt: null,
  },
] as never;

const FOLDERS_PAYLOAD = {
  state: 'AVAILABLE',
  folders: [
    { path: 'INBOX', name: 'INBOX', role: 'INBOX', total: 12, unread: 3 },
    { path: 'Sent', name: 'Sent', role: 'SENT', total: 4, unread: null },
    // Outside the five roles: it keeps the provider's own name.
    { path: 'Drafts', name: 'Drafts', role: 'DRAFTS', total: 1, unread: 0 },
    { path: 'Clients', name: 'Clients', role: 'CUSTOM', total: null, unread: null },
  ],
};

// Where a saved draft lands, and what the server holds for it. Resuming reads
// the recipients and the text back from here rather than from a local copy.
const DRAFTS_PAGE_PAYLOAD = {
  state: 'AVAILABLE',
  folder: 'Drafts',
  uidValidity: '3421553009',
  messages: [
    {
      uid: '21',
      subject: 'Devis révisé',
      from: [{ address: 'ops@kovaalab.test', name: null }],
      to: [{ address: 'marie@client.test', name: null }],
      cc: [],
      occurredAt: '2026-10-30T08:00:00.000Z',
      seen: true,
      size: 900,
    },
  ],
  nextCursor: null,
};

const DRAFT_MESSAGE_PAYLOAD = {
  state: 'AVAILABLE',
  conversationId: CONVERSATION_ID,
  folder: 'Drafts',
  uid: '21',
  uidValidity: '3421553009',
  direction: 'OUTBOUND',
  from: ['ops@kovaalab.test'],
  to: ['marie@client.test'],
  cc: [],
  bcc: [],
  subject: 'Devis révisé',
  text: 'Voici le devis corrigé.',
  remoteImagesBlocked: true,
  attachments: [],
};

const MESSAGES_PAYLOAD = {
  state: 'AVAILABLE',
  folder: 'INBOX',
  // A string, and well past what a GraphQL Int would hold.
  uidValidity: '3421553009',
  messages: [
    {
      uid: '4294967200',
      subject: 'Devis chantier Lyon',
      from: [{ address: 'marie@client.test', name: 'Marie Dubois' }],
      to: [{ address: 'ops@kovaalab.test', name: null }],
      cc: [],
      occurredAt: '2026-10-29T09:12:00.000Z',
      seen: false,
      size: 8421,
    },
    {
      uid: '4294967100',
      subject: 'Relance facture 2291',
      from: [{ address: 'compta@client.test', name: null }],
      to: [{ address: 'ops@kovaalab.test', name: null }],
      cc: [],
      occurredAt: '2026-10-28T16:40:00.000Z',
      seen: true,
      size: 2210,
    },
  ],
  // A cursor means there is another page to ask for.
  nextCursor: 'eyJmb2xkZXIiOiJJTkJPWCJ9',
};

// The message read answers under the exact scope the list published: the
// folder, the UID as a string, and the UIDVALIDITY of the selected mailbox.
const MESSAGE_PAYLOAD = {
  state: 'AVAILABLE',
  conversationId: CONVERSATION_ID,
  messageId: 'f0f2c9a0-1111-2222-3333-444455556666',
  folder: 'INBOX',
  uid: '4294967200',
  uidValidity: '3421553009',
  direction: 'INBOUND',
  from: ['marie@client.test'],
  to: ['ops@kovaalab.test'],
  cc: [],
  // Absent on purpose: the server discloses Bcc to the mailbox owner only,
  // and an absent field is that rule rather than an empty Bcc.
  subject: 'Devis chantier Lyon',
  text: 'Bonjour, pouvez-vous confirmer le devis ?',
  remoteImagesBlocked: true,
  attachments: [
    {
      index: 0,
      assetId: SOURCE_ASSET_ID,
      filename: 'devis.pdf',
      mimeType: 'application/pdf',
      contentId: null,
      state: 'READY',
    },
    {
      index: 1,
      filename: 'enorme.zip',
      mimeType: 'application/zip',
      state: 'UNSUPPORTED',
    },
  ],
};

// The V3 policy of the open mail conversation, as the server resolves it.
// The effective mode is the server's answer and is never recomputed here.
const policyPayload = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'HermesConversationBotPolicy',
  conversationId: CONVERSATION_ID,
  localMode: 'INHERIT',
  effectiveMode: 'ASSISTED',
  reason: 'WORKSPACE_POLICY',
  revision: 'a1b2c3d4',
  canDraft: true,
  canAutoReply: false,
  ...overrides,
});

const DRAFT_REPLY_PAYLOAD = {
  __typename: 'HermesInboxDraftReply',
  mode: 'DRAFT',
  status: 'READY',
  provider: 'HERMES_MCP',
  text: 'Bonjour Marie, je vous confirme le devis.',
};

type Recorder = jest.Mock<{ data: Record<string, unknown> }, [unknown]>;

const recorder = (field: string, payload: unknown): Recorder =>
  jest.fn(() => ({ data: { [field]: payload } })) as unknown as Recorder;

const variablesOf = (mock: Recorder, call = 0): Record<string, unknown> =>
  ((mock.mock.calls[call]?.[0] ?? {}) as { input?: Record<string, unknown> })
    .input ?? {};

const renderMailbox = ({
  connections = CONNECTIONS_PAYLOAD,
  botPolicy = null,
  user = USER_A,
  workspace = WORKSPACE_A,
}: {
  connections?: unknown;
  botPolicy?: Record<string, unknown> | null;
  user?: never;
  workspace?: never;
} = {}) => {
  // Every mutation is mocked with a recording result and a matcher that
  // accepts any variables, so both the absence of an emission and the exact
  // input of one are observed here rather than inferred.
  const plan = recorder('hermesMailPlanV4', {
    state: 'PLANNED',
    conversationId: FORWARD_CONVERSATION_ID,
    envelope: {
      from: 'ops@kovaalab.test',
      to: [],
      cc: [],
      subject: 'Fwd: Devis chantier Lyon',
      text: '--- Message transféré ---',
      references: [],
    },
  });
  const clone = recorder('hermesMailCloneAttachmentV4', {
    id: CLONED_ASSET_ID,
    kind: 'FILE',
    filename: 'devis.pdf',
    mimeType: 'application/pdf',
    size: 8421,
    status: 'READY',
  });
  const send = recorder('hermesMailSendV4', {
    id: 'f0f2c9a0-1111-2222-3333-444455556666',
    conversationId: FORWARD_CONVERSATION_ID,
    status: 'ACCEPTED',
    sentCopy: { state: 'SAVED' },
  });
  const saveDraft = recorder('hermesMailSaveDraftV4', {
    state: 'SAVED',
    conversationId: CONVERSATION_ID,
    folder: 'Drafts',
    uid: '17',
    uidValidity: '3421553009',
  });

  // Two saves in a row: the first hands back the opaque revision, the second
  // must carry that very string back.
  let createDraftCall = 0;
  const createDraft = jest.fn(() => {
    createDraftCall += 1;

    return {
      data: {
        hermesMailCreateDraftV4: {
          state: 'SAVED',
          replay: false,
          draftId: null,
          draftRevision: 'a'.repeat(63) + String(createDraftCall),
          conversationId: CONVERSATION_ID,
          folder: 'Drafts',
          uid: '21',
          uidValidity: '3421553009',
        },
      },
    };
  }) as unknown as Recorder;

  const sendNew = recorder('hermesMailSendNewV4', {
    id: 'c1c2c3c4-1111-2222-3333-444455556666',
    conversationId: CONVERSATION_ID,
    status: 'ACCEPTED',
    sentCopy: { state: 'SAVED' },
    draftDisposition: { state: 'MOVED_TO_TRASH' },
  });

  const draftReply = recorder('hermesInboxDraftReply', DRAFT_REPLY_PAYLOAD);
  const setPolicy = recorder(
    'hermesSetConversationBotPolicy',
    policyPayload({ localMode: 'OFF', effectiveMode: 'OFF' }),
  );

  const anyVariables = () => true;

  const mocks = [
    // Mounted only when a test states a policy. Without one the read fails,
    // which is the 'unknown' the screen is supposed to show.
    ...(botPolicy === null
      ? []
      : [
          {
            request: {
              query: HERMES_CONVERSATION_BOT_POLICY,
              variables: anyVariables,
            },
            result: { data: { hermesConversationBotPolicy: botPolicy } },
            maxUsageCount: Number.POSITIVE_INFINITY,
          },
        ]),
    {
      request: { query: HERMES_INBOX_DRAFT_REPLY, variables: anyVariables },
      result: draftReply,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: {
        query: HERMES_SET_CONVERSATION_BOT_POLICY,
        variables: anyVariables,
      },
      result: setPolicy,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: { query: HERMES_CONNECTIONS_V4 },
      result: { data: { hermesConnectionsV4: connections } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: { query: HERMES_MAIL_FOLDERS_V4 },
      result: { data: { hermesMailFoldersV4: FOLDERS_PAYLOAD } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: {
        query: HERMES_MAIL_MESSAGES_V4,
        variables: {
          input: { folder: 'INBOX', limit: HERMES_MAILBOX_RUNTIME_PAGE_SIZE },
        },
      },
      result: { data: { hermesMailMessagesV4: MESSAGES_PAYLOAD } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: {
        query: HERMES_MAIL_MESSAGE_V4,
        variables: {
          input: {
            folder: 'INBOX',
            uid: '4294967200',
            uidValidity: '3421553009',
          },
        },
      },
      result: { data: { hermesMailMessageV4: MESSAGE_PAYLOAD } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: {
        query: HERMES_MAIL_MESSAGES_V4,
        variables: {
          input: { folder: 'Drafts', limit: HERMES_MAILBOX_RUNTIME_PAGE_SIZE },
        },
      },
      result: { data: { hermesMailMessagesV4: DRAFTS_PAGE_PAYLOAD } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: {
        query: HERMES_MAIL_MESSAGE_V4,
        variables: {
          input: {
            folder: 'Drafts',
            uid: '21',
            uidValidity: '3421553009',
          },
        },
      },
      result: { data: { hermesMailMessageV4: DRAFT_MESSAGE_PAYLOAD } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    { request: { query: HERMES_MAIL_PLAN_V4, variables: anyVariables }, result: plan, maxUsageCount: Number.POSITIVE_INFINITY },
    { request: { query: HERMES_MAIL_CLONE_ATTACHMENT_V4, variables: anyVariables }, result: clone, maxUsageCount: Number.POSITIVE_INFINITY },
    { request: { query: HERMES_MAIL_SEND_V4, variables: anyVariables }, result: send, maxUsageCount: Number.POSITIVE_INFINITY },
    { request: { query: HERMES_MAIL_SAVE_DRAFT_V4, variables: anyVariables }, result: saveDraft, maxUsageCount: Number.POSITIVE_INFINITY },
    { request: { query: HERMES_MAIL_CREATE_DRAFT_V4, variables: anyVariables }, result: createDraft, maxUsageCount: Number.POSITIVE_INFINITY },
    { request: { query: HERMES_MAIL_SEND_NEW_V4, variables: anyVariables }, result: sendNew, maxUsageCount: Number.POSITIVE_INFINITY },
  ];

  resetJotaiStore();
  jotaiStore.set(myConnectedAccountsState.atom, CONNECTED_ACCOUNTS);
  // A draft identity is scoped to a person in a company, so both are stated.
  jotaiStore.set(currentUserState.atom, user);
  jotaiStore.set(currentWorkspaceState.atom, workspace);

  const { unmount } = render(
    <I18nProvider i18n={i18n}>
      <JotaiProvider store={jotaiStore}>
        <MockedProvider mocks={mocks as never}>
          <HermesMailboxRuntime />
        </MockedProvider>
      </JotaiProvider>
    </I18nProvider>,
  );

  return {
    plan,
    clone,
    send,
    saveDraft,
    createDraft,
    sendNew,
    draftReply,
    setPolicy,
    unmount,
  };
};

const prefixedKeys = () =>
  Object.keys(window.localStorage).filter((key) =>
    key.startsWith(HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX),
  );

// Save one draft from a freshly rendered mailbox and hand back its identity.
const saveOneDraft = async (view: { createDraft: Recorder }) => {
  await screen.findByText('Devis chantier Lyon');
  await userEvent.click(screen.getByRole('button', { name: 'New message' }));
  await screen.findByRole('form', { name: 'New message' });

  await userEvent.type(
    screen.getByRole('textbox', { name: 'To' }),
    'marie@client.test',
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Subject' }),
    'Devis révisé',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
  await waitFor(() => expect(view.createDraft).toHaveBeenCalledTimes(1));

  return variablesOf(view.createDraft, 0);
};

// Walk into the provider's Drafts folder and open the saved message.
const openSavedDraft = async () => {
  await screen.findByText('Devis chantier Lyon');
  await userEvent.click(screen.getByRole('button', { name: /Drafts/ }));
  await userEvent.click(await screen.findByText('Devis révisé'));

  return screen.findByText('Voici le devis corrigé.');
};

const openFirstMessage = async () => {
  await userEvent.click(await screen.findByText('Devis chantier Lyon'));

  return screen.findByText('Bonjour, pouvez-vous confirmer le devis ?');
};

// Draft identities outlive a reload on purpose, so each test starts from a
// browser that was issued none.
beforeEach(() => {
  window.localStorage.clear();
});

describe('HermesMailboxRuntime', () => {
  it('renders the real folders and the first page of a folder, and emits nothing on mount', async () => {
    const { plan, send, saveDraft, createDraft, sendNew } = renderMailbox();

    // The inbox is opened on its own, so the screen lands on a list rather
    // than on a folder picker. Awaited first because selecting the inbox
    // remounts the lower panels.
    expect(await screen.findByText('Devis chantier Lyon')).toBeVisible();
    expect(screen.getByText('Relance facture 2291')).toBeVisible();

    // The folders come from hermesMailFoldersV4: the roles are named by the
    // library, the counts are the server's, and the provider folder outside
    // the five roles keeps its own label.
    expect(screen.getByRole('button', { name: /Inbox/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /3 unread/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Sent/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Clients/ })).toBeVisible();

    // The server handed back a cursor, so the next page can be asked for.
    expect(screen.getByRole('button', { name: 'Load more' })).toBeVisible();

    // The unconnected screen is a different screen, and this is not it.
    expect(screen.queryByText('No mailbox is connected')).not.toBeInTheDocument();

    // Mounting a mailbox reads; it never emits.
    await waitFor(() => expect(plan).not.toHaveBeenCalled());
    expect(send).not.toHaveBeenCalled();
    expect(saveDraft).not.toHaveBeenCalled();
    expect(createDraft).not.toHaveBeenCalled();
    expect(sendNew).not.toHaveBeenCalled();
  });

  it('reads the opened message under its own UID and validity, and offers a download only for the imported file', async () => {
    const { plan, send } = renderMailbox();

    expect(await openFirstMessage()).toBeVisible();

    // The provider's direction, not a guess from the author's address.
    expect(screen.getByText('Received')).toBeVisible();
    // Bcc was not disclosed to this reader, which is a rule and not a gap.
    expect(screen.getByText(/Bcc/)).toBeVisible();

    // The imported part is downloadable; the one the server refused is not.
    expect(
      screen.getByRole('button', { name: 'Download devis.pdf' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Download enorme\.zip/ }),
    ).toBeDisabled();

    await waitFor(() => expect(plan).not.toHaveBeenCalled());
    expect(send).not.toHaveBeenCalled();
  });

  it('resolves the sender from the central connection rather than the first connected account', async () => {
    const { plan } = renderMailbox();

    expect(await openFirstMessage()).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() => expect(plan).toHaveBeenCalledTimes(1));

    // sales@ is the first non-archived account; ops@ is the one the central
    // MAIL connection authorises, and it is the one that travels.
    expect(variablesOf(plan).from).toBe('ops@kovaalab.test');
  });

  it('offers no sender at all when the central connection names an account this workspace does not hold', async () => {
    const { plan } = renderMailbox({
      connections: [
        {
          kind: 'MAIL',
          connectionId: 'c0ffee00-1111-4111-8111-c0ffee000001',
          revision: 7,
          state: 'CONFIGURED_UNVERIFIED',
          settings: {
            connectedAccountId: 'deadbeef-1111-4111-8111-deadbeef0001',
            mailbox: 'INBOX',
          },
        },
      ],
    });

    expect(await openFirstMessage()).toBeVisible();

    // Closed by default: no new-message action, and planning an answer is
    // refused locally rather than sent with a guessed sender.
    expect(
      screen.queryByRole('button', { name: 'New message' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(plan).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        /answer could not be prepared|The mailbox could not/i,
      ),
    ).toBeVisible();
  });

  it('composes a new message: saves it under a stable draft id, replays the opaque revision, then sends under its own request id', async () => {
    const { createDraft, sendNew } = renderMailbox();

    await screen.findByText('Devis chantier Lyon');
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));

    // No original to answer, so nothing was planned: the editor opens on an
    // empty envelope whose only server-sourced value is the sender.
    expect(
      await screen.findByRole('form', { name: 'New message' }),
    ).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'To' }),
      'marie@client.test',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Subject' }),
      'Devis révisé',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'Voici le devis corrigé.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(createDraft).toHaveBeenCalledTimes(1));

    const firstSave = variablesOf(createDraft, 0);

    expect(firstSave.from).toBe('ops@kovaalab.test');
    expect(firstSave.to).toEqual(['marie@client.test']);
    expect(firstSave.subject).toBe('Devis révisé');
    expect(typeof firstSave.draftId).toBe('string');
    // Nothing to compare against on a first save.
    expect(firstSave.draftRevision).toBeUndefined();

    await waitFor(() =>
      expect(screen.getByText(/Saved as a draft/)).toBeVisible(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(createDraft).toHaveBeenCalledTimes(2));

    const secondSave = variablesOf(createDraft, 1);

    // The stable identity is unchanged and the opaque revision goes back
    // exactly as it arrived.
    expect(secondSave.draftId).toBe(firstSave.draftId);
    expect(secondSave.draftRevision).toBe('a'.repeat(63) + '1');

    await userEvent.click(screen.getByRole('button', { name: 'Request send' }));
    await waitFor(() => expect(sendNew).toHaveBeenCalledTimes(1));

    const sent = variablesOf(sendNew);

    // Two identifiers, and they are not the same thing: the draft's stable id
    // and this one immutable send attempt.
    expect(sent.draftId).toBe(firstSave.draftId);
    expect(typeof sent.clientRequestId).toBe('string');
    expect(sent.clientRequestId).not.toBe(sent.draftId);
    expect(sent.subject).toBe('Devis révisé');
  });

  it('forwards by cloning the source attachment and sending the clone id, never the source one', async () => {
    const { plan, clone, send } = renderMailbox();

    expect(await openFirstMessage()).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Forward' }));

    await waitFor(() => expect(clone).toHaveBeenCalledTimes(1));

    // Only the imported part is cloned, from the source thread into the
    // forward's own conversation the planning call reserved.
    expect(variablesOf(clone)).toEqual({
      sourceConversationId: CONVERSATION_ID,
      sourceAssetId: SOURCE_ASSET_ID,
      targetConversationId: FORWARD_CONVERSATION_ID,
    });
    expect(plan).toHaveBeenCalledTimes(1);

    await userEvent.type(
      await screen.findByRole('textbox', { name: 'To' }),
      'archive@client.test',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Request send' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    const sent = variablesOf(send);

    expect(sent.mode).toBe('FORWARD');
    // The clone's id, and nothing from the source thread.
    expect(sent.attachmentIds).toEqual([CLONED_ASSET_ID]);
    expect(sent.conversationId).toBe(FORWARD_CONVERSATION_ID);
    // A forward's planning id is the one the send reuses, because the server
    // derives the draft conversation from it.
    expect(typeof sent.clientRequestId).toBe('string');
    expect(variablesOf(plan).clientRequestId).toBe(sent.clientRequestId);
  });

  it('resumes a saved draft from the provider Drafts folder, keeping its stable id and opaque revision', async () => {
    const { createDraft } = renderMailbox();

    await screen.findByText('Devis chantier Lyon');
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    await screen.findByRole('form', { name: 'New message' });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'To' }),
      'marie@client.test',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Subject' }),
      'Devis révisé',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(createDraft).toHaveBeenCalledTimes(1));

    const draftId = variablesOf(createDraft, 0).draftId;

    // Walking into the Drafts folder remounts the list and the editor. The
    // draft's stable identity has to survive that, which is the whole point of
    // holding it above the folder.
    await userEvent.click(screen.getByRole('button', { name: /Drafts/ }));
    await userEvent.click(await screen.findByText('Devis révisé'));

    // The card says it was never sent, and the resume is offered on exactly
    // the native message the save landed on.
    expect(await screen.findByText('Saved here and never sent.')).toBeVisible();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Resume this draft' }),
    );

    // The recipients and the text come back from the server's own read of the
    // native draft, not from a local copy of what was typed.
    const toField = await screen.findByRole('textbox', { name: 'To' });

    expect(toField).toHaveValue('marie@client.test');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Voici le devis corrigé.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(createDraft).toHaveBeenCalledTimes(2));

    const resumedSave = variablesOf(createDraft, 1);

    expect(resumedSave.draftId).toBe(draftId);
    // The revision the first save handed back, returned verbatim.
    expect(resumedSave.draftRevision).toBe('a'.repeat(63) + '1');
  });

  it('resumes a draft after a reload, replaying the identity and the revision the server issued', async () => {
    const first = renderMailbox();

    await screen.findByText('Devis chantier Lyon');
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    await screen.findByRole('form', { name: 'New message' });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'To' }),
      'marie@client.test',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Subject' }),
      'Devis révisé',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(first.createDraft).toHaveBeenCalledTimes(1));

    const issued = variablesOf(first.createDraft, 0);

    // The reload. Every piece of React state the session held is gone with
    // the tree, which is exactly what used to take the resume with it.
    first.unmount();

    const second = renderMailbox();

    await screen.findByText('Devis chantier Lyon');
    await userEvent.click(screen.getByRole('button', { name: /Drafts/ }));
    await userEvent.click(await screen.findByText('Devis révisé'));

    expect(await screen.findByText('Saved here and never sent.')).toBeVisible();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Resume this draft' }),
    );

    // The recipients and the body come from the server's read of the native
    // draft, so they are what the provider holds and not what was typed.
    expect(await screen.findByRole('textbox', { name: 'To' })).toHaveValue(
      'marie@client.test',
    );
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Voici le devis corrigé.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(second.createDraft).toHaveBeenCalledTimes(1));

    const resumed = variablesOf(second.createDraft, 0);

    // The stable identity and the opaque revision the first save was given,
    // handed back byte for byte across the reload.
    expect(resumed.draftId).toBe(issued.draftId);
    expect(resumed.draftRevision).toBe('a'.repeat(63) + '1');
  });

  it('offers no resume on a native draft this browser was never issued an identity for', async () => {
    renderMailbox();

    await screen.findByText('Devis chantier Lyon');
    await userEvent.click(screen.getByRole('button', { name: /Drafts/ }));
    await userEvent.click(await screen.findByText('Devis révisé'));

    // The message is read and shown; what is absent is the claim that it can
    // be picked up again here.
    expect(await screen.findByText('Voici le devis corrigé.')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Resume this draft' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/its identity is unknown here/),
    ).toBeVisible();
  });

  it('under OFF, in this mail screen, the bot is never called and the human reply still works', async () => {
    const { draftReply, send } = renderMailbox({
      botPolicy: policyPayload({ localMode: 'OFF', effectiveMode: 'OFF' }),
    });

    expect(await openFirstMessage()).toBeVisible();

    // The mode is the server's answer, read on the open message.
    expect(await screen.findByText('Bot stopped')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await screen.findByRole('textbox', { name: 'Message' });

    // Nothing to press, so nothing can be asked for.
    expect(
      screen.queryByRole('button', { name: 'Ask the bot for a draft' }),
    ).not.toBeInTheDocument();
    expect(draftReply).not.toHaveBeenCalled();

    // Replying by hand does not depend on the bot, including under OFF.
    await userEvent.type(
      screen.getByRole('textbox', { name: 'To' }),
      'marie@client.test',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'Je vous réponds moi-même.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Request send' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(variablesOf(send).mode).toBe('REPLY');
    // The planning call seeded the body, so the person's sentence is checked
    // inside it rather than against it.
    expect(variablesOf(send).text).toContain('Je vous réponds moi-même.');
    // Still never called: the only emission was the person's own.
    expect(draftReply).not.toHaveBeenCalled();
  });

  it('under ASSISTED, in this mail screen, a draft is prepared and inserted and nothing is sent', async () => {
    const { draftReply, send, sendNew } = renderMailbox({
      botPolicy: policyPayload({ localMode: 'ASSISTED', effectiveMode: 'ASSISTED' }),
    });

    expect(await openFirstMessage()).toBeVisible();
    expect(await screen.findByText('Bot drafts, you send')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await screen.findByRole('textbox', { name: 'Message' });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ask the bot for a draft' }),
    );

    await waitFor(() => expect(draftReply).toHaveBeenCalledTimes(1));

    // Asked against the canonical conversation and message the mail read
    // published, not against anything built here.
    expect(variablesOf(draftReply)).toEqual({
      conversationId: CONVERSATION_ID,
      messageId: 'f0f2c9a0-1111-2222-3333-444455556666',
    });

    // The proposal is shown and the editor still holds exactly what the
    // server planned: a proposal never writes itself into the message.
    expect(
      await screen.findByText('Bonjour Marie, je vous confirme le devis.'),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      '--- Message transféré ---',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Insert this draft' }),
    );

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Bonjour Marie, je vous confirme le devis.',
    );

    // Preparing a draft and inserting it sent nothing. ASSISTED never emits.
    expect(send).not.toHaveBeenCalled();
    expect(sendNew).not.toHaveBeenCalled();
  });

  it('changes the bot mode from the mail screen through the V3 policy, with the revision it read', async () => {
    const { setPolicy } = renderMailbox({
      botPolicy: policyPayload({ localMode: 'INHERIT', effectiveMode: 'ASSISTED' }),
    });

    expect(await openFirstMessage()).toBeVisible();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Stop the bot' }),
    );

    await waitFor(() => expect(setPolicy).toHaveBeenCalledTimes(1));

    // The write carries the revision the policy read handed over, so a stale
    // decision is refused by the server instead of overwriting another one.
    // No delegation travels with anything but an explicit AUTO.
    expect(variablesOf(setPolicy)).toEqual({
      conversationId: CONVERSATION_ID,
      mode: 'OFF',
      expectedRevision: 'a1b2c3d4',
    });
  });

  it('says the bot mode is unknown rather than guessing when the policy cannot be read', async () => {
    const { draftReply } = renderMailbox();

    expect(await openFirstMessage()).toBeVisible();

    expect(await screen.findByText('Bot mode unknown')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await screen.findByRole('textbox', { name: 'Message' });

    // An unreadable policy closes the action instead of opening it on a guess.
    expect(
      screen.queryByRole('button', { name: 'Ask the bot for a draft' }),
    ).not.toBeInTheDocument();
    expect(draftReply).not.toHaveBeenCalled();
  });

  it('keeps the same mailbox and the same UID apart in two companies', async () => {
    const first = renderMailbox({ user: USER_A, workspace: WORKSPACE_A });
    const issued = await saveOneDraft(first);

    first.unmount();

    // The same person, the same mailbox address, the same native UID — in
    // another company. The identity belongs to the company that was issued it.
    const other = renderMailbox({ user: USER_A, workspace: WORKSPACE_B });

    expect(await openSavedDraft()).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Resume this draft' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/its identity is unknown here/)).toBeVisible();

    other.unmount();

    // Back in the company it was issued to, it resumes.
    const back = renderMailbox({ user: USER_A, workspace: WORKSPACE_A });

    expect(await openSavedDraft()).toBeVisible();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Resume this draft' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(back.createDraft).toHaveBeenCalledTimes(1));

    expect(variablesOf(back.createDraft, 0).draftId).toBe(issued.draftId);
  });

  it('leaves nothing readable after the session purge, for this user or the next', async () => {
    const first = renderMailbox({ user: USER_A, workspace: WORKSPACE_A });

    await saveOneDraft(first);
    expect(prefixedKeys()).toHaveLength(1);

    first.unmount();

    // The hook Auth calls from purgeSessionStorage on sign-out and on a
    // workspace switch.
    clearHermesMailboxRuntimeDraftIdentities();

    expect(prefixedKeys()).toEqual([]);

    // Another person on the same device sees no trace of the first one.
    renderMailbox({ user: USER_B, workspace: WORKSPACE_A });

    expect(await openSavedDraft()).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Resume this draft' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/its identity is unknown here/)).toBeVisible();
  });

  it('does not offer an identity issued under a previous binding of the account', async () => {
    const first = renderMailbox();

    await saveOneDraft(first);
    first.unmount();

    // The account was rebound: same mailbox, newer revision.
    const rotated = renderMailbox({
      connections: ROTATED_CONNECTIONS_PAYLOAD,
    });

    expect(await openSavedDraft()).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Resume this draft' }),
    ).not.toBeInTheDocument();

    // And saving under the new binding supersedes the old record rather than
    // leaving it on the device.
    await userEvent.click(screen.getByRole('button', { name: 'New message' }));
    await screen.findByRole('form', { name: 'New message' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Subject' }),
      'Autre brouillon',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(rotated.createDraft).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(prefixedKeys()).toHaveLength(1));
    expect(prefixedKeys()[0]).toContain('8');
  });
});
