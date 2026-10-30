import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';

import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import { HermesMailboxRuntime } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntime';
import { HERMES_MAIL_PLAN_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailPlanV4';
import { HERMES_MAIL_SAVE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSaveDraftV4';
import { HERMES_MAIL_SEND_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendV4';
import { HERMES_MAIL_FOLDERS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailFoldersV4';
import { HERMES_MAIL_MESSAGES_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessagesV4';
import { HERMES_MAIL_MESSAGE_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessageV4';
import { HERMES_MAILBOX_RUNTIME_PAGE_SIZE } from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

// One connected account, so the screen knows its own address and can name an
// authorised sender. Only `handle` and `handleAliases` are read.
const CONNECTED_ACCOUNT = {
  id: 'account-1',
  handle: 'ops@kovaalab.test',
  handleAliases: ['billing@kovaalab.test'],
  archivedAt: null,
} as never;

const FOLDERS_PAYLOAD = {
  state: 'AVAILABLE',
  folders: [
    { path: 'INBOX', name: 'INBOX', role: 'INBOX', total: 12, unread: 3 },
    { path: 'Sent', name: 'Sent', role: 'SENT', total: 4, unread: null },
    // Outside the five roles: it keeps the provider's own name.
    { path: 'Clients', name: 'Clients', role: 'CUSTOM', total: null, unread: null },
  ],
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
  nextCursor: 'eyJmb2xkZXIiOiJJTkJPWCJ9',
};

// The message read answers under the exact scope the list published: the
// folder, the UID as a string, and the UIDVALIDITY of the selected mailbox.
const MESSAGE_PAYLOAD = {
  state: 'AVAILABLE',
  conversationId: '6f1d1f8e-3a2b-4c55-9f10-7d3b2a9c4e01',
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
      filename: 'devis.pdf',
      mimeType: 'application/pdf',
      state: 'UNSUPPORTED',
    },
  ],
};

const renderMailbox = () => {
  // Every mutation is mocked with a recording result and a matcher that
  // accepts any variables, so an emission at mount would be observed here
  // instead of merely failing somewhere downstream.
  const planResult = jest.fn(() => ({ data: { hermesMailPlanV4: {} } }));
  const sendResult = jest.fn(() => ({ data: { hermesMailSendV4: {} } }));
  const saveDraftResult = jest.fn(() => ({
    data: { hermesMailSaveDraftV4: {} },
  }));

  const mocks = [
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
      request: { query: HERMES_MAIL_PLAN_V4, variables: () => true },
      result: planResult,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: { query: HERMES_MAIL_SEND_V4, variables: () => true },
      result: sendResult,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
    {
      request: { query: HERMES_MAIL_SAVE_DRAFT_V4, variables: () => true },
      result: saveDraftResult,
      maxUsageCount: Number.POSITIVE_INFINITY,
    },
  ];

  resetJotaiStore();
  jotaiStore.set(myConnectedAccountsState.atom, [CONNECTED_ACCOUNT]);

  render(
    <I18nProvider i18n={i18n}>
      <JotaiProvider store={jotaiStore}>
        <MockedProvider mocks={mocks as never}>
          <HermesMailboxRuntime />
        </MockedProvider>
      </JotaiProvider>
    </I18nProvider>,
  );

  return { planResult, sendResult, saveDraftResult };
};

describe('HermesMailboxRuntime', () => {
  it('renders the real folders and the first page of a folder, and emits nothing on mount', async () => {
    const { planResult, sendResult, saveDraftResult } = renderMailbox();

    // The inbox is opened on its own, so the screen lands on a list rather
    // than on a folder picker, and the list is the one hermesMailMessagesV4
    // answered with, read under the UIDVALIDITY it came with.
    //
    // Awaited first because selecting the inbox remounts the lower panels:
    // this row only exists once that has settled.
    expect(await screen.findByText('Devis chantier Lyon')).toBeVisible();
    expect(screen.getByText('Relance facture 2291')).toBeVisible();

    // The folders come from hermesMailFoldersV4: the roles are named by the
    // library, the counts are the server's, and the provider folder outside
    // the five roles keeps its own label.
    expect(screen.getByRole('button', { name: /Inbox/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /3 unread/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Sent/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Clients/ })).toBeVisible();

    // The unconnected screen is a different screen, and this is not it.
    expect(
      screen.queryByText('No mailbox is connected'),
    ).not.toBeInTheDocument();

    // Nothing was planned, saved or sent. Mounting a mailbox reads; it never
    // emits.
    await waitFor(() => expect(planResult).not.toHaveBeenCalled());
    expect(sendResult).not.toHaveBeenCalled();
    expect(saveDraftResult).not.toHaveBeenCalled();
  });

  it('reads the opened message under its own UID and validity, and still emits nothing', async () => {
    const { planResult, sendResult, saveDraftResult } = renderMailbox();

    await userEvent.click(await screen.findByText('Devis chantier Lyon'));

    // The body is the server's, already sanitised and image-free. The mocked
    // read is only reached when the folder, the string UID and the UIDVALIDITY
    // all match what the list published.
    expect(
      await screen.findByText('Bonjour, pouvez-vous confirmer le devis ?'),
    ).toBeVisible();

    // The provider's direction, not a guess from the author's address.
    expect(screen.getByText('Received')).toBeVisible();

    // Bcc was not disclosed to this reader, which is a rule and not a gap.
    expect(screen.getByText(/Bcc/)).toBeVisible();

    // An answer is planned only when somebody asks for one.
    await waitFor(() => expect(planResult).not.toHaveBeenCalled());
    expect(sendResult).not.toHaveBeenCalled();
    expect(saveDraftResult).not.toHaveBeenCalled();
  });
});
