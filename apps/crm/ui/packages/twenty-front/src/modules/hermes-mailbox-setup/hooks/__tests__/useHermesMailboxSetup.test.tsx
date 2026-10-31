import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

import { useHermesMailboxSetup } from '@/hermes-mailbox-setup/hooks/useHermesMailboxSetup';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';
import { SaveImapSmtpCaldavAccountDocument } from '~/generated-metadata/graphql';

// HARNESS SUBSTITUTION: the toast host is an application-level provider.
const enqueueToast = jest.fn();

jest.mock('kovaa-lab-ui/components/feedback', () => ({
  useToast: () => ({ enqueueToast }),
}));

const MAILBOX = 'contact@atelier.example';
const NEW_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';

// A form value carrying BOTH protocols, which is what the central binding
// requires. The hook refuses to send anything less.
const completeFormValues = {
  name: 'Atelier',
  handle: MAILBOX,
  IMAP: {
    host: 'imap.atelier.example',
    port: 993,
    password: 'mot-de-passe',
    connectionSecurity: 'SSL_TLS',
  },
  SMTP: {
    host: 'smtp.atelier.example',
    port: 465,
    password: 'mot-de-passe',
    connectionSecurity: 'SSL_TLS',
  },
} as never;

const buildSaveMock = (connectedAccountId: string | null): MockedResponse => ({
  request: {
    query: SaveImapSmtpCaldavAccountDocument,
    variables: () => true,
  },
  maxUsageCount: 10,
  result: {
    data: {
      saveImapSmtpCaldavAccount: {
        __typename: 'ImapSmtpCaldavConnectionSuccess',
        success: true,
        connectedAccountId,
      },
    },
  },
});

const accountsMock: MockedResponse = {
  request: { query: GET_MY_CONNECTED_ACCOUNTS },
  maxUsageCount: 10,
  result: { data: { myConnectedAccounts: [] } },
};

const renderSetup = (saveMock: MockedResponse = buildSaveMock(NEW_ACCOUNT_ID)) => {
  // Each operation's context is recorded on its way out: that is where the
  // retry decision is read from.
  const operations: { name: string; skipRetry: unknown }[] = [];

  const captureLink = new ApolloLink((operation, forward) => {
    operations.push({
      name: operation.operationName,
      skipRetry: operation.getContext().skipRetry,
    });

    return forward(operation);
  });

  const client = new ApolloClient({
    link: ApolloLink.from([
      captureLink,
      new MockLink([saveMock, accountsMock]),
    ]),
    cache: new InMemoryCache(),
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </ApolloProvider>
  );

  const rendered = renderHook(() => useHermesMailboxSetup(), { wrapper });

  return { ...rendered, operations };
};

describe('useHermesMailboxSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forbids the transport from replaying the mailbox creation', async () => {
    const { result, operations } = renderSetup();

    await act(async () => {
      await result.current.handleSave(completeFormValues);
    });

    // ApolloFactory's RetryLink runs with `attempts.max: 2` and retries on any
    // network error unless the operation opts out. MockedProvider mounts no
    // RetryLink, so what is observable here — and what that link reads — is
    // the flag on the operation. Without it a lost answer can create a SECOND
    // connected account, the one write in this module that nothing here undoes.
    const save = operations.find(
      (operation) => operation.name === 'SaveImapSmtpCaldavAccount',
    );

    expect(save).toBeDefined();
    expect(save?.skipRetry).toBe(true);
  });

  it('sends nothing at all when a protocol is missing', async () => {
    const { result, operations } = renderSetup();

    await act(async () => {
      await result.current.handleSave({
        ...(completeFormValues as object),
        SMTP: { host: '', port: 465, password: '' },
      } as never);
    });

    expect(
      operations.find(
        (operation) => operation.name === 'SaveImapSmtpCaldavAccount',
      ),
    ).toBeUndefined();
    expect(result.current.outcome).toEqual({
      kind: 'not-sent',
      missing: ['SMTP'],
    });
  });

  it('refuses a second creation while the first answer carries no account', async () => {
    // The server accepted the write and returned no usable id, so the account
    // may exist. This is MAIL-REVIEW03 at the hook, where the guard that
    // actually refuses lives — a withdrawn button is a separate claim.
    const { result, operations } = renderSetup(buildSaveMock(null));

    await act(async () => {
      await result.current.handleSave(completeFormValues);
    });

    expect(result.current.outcome).toEqual({
      kind: 'unconfirmed',
      listReread: false,
    });
    expect(result.current.canRetryWrite).toBe(false);

    const savesAfterFirst = operations.filter(
      (operation) => operation.name === 'SaveImapSmtpCaldavAccount',
    ).length;

    expect(savesAfterFirst).toBe(1);

    // A second attempt from anywhere must not reach the server.
    await act(async () => {
      await result.current.handleSave(completeFormValues);
    });

    expect(
      operations.filter(
        (operation) => operation.name === 'SaveImapSmtpCaldavAccount',
      ).length,
    ).toBe(1);

    // The re-read is the one action available, and it writes nothing.
    await act(async () => {
      await result.current.retryAccountsRead();
    });

    expect(result.current.outcome).toEqual({
      kind: 'unconfirmed',
      listReread: true,
    });
    expect(
      operations.filter(
        (operation) => operation.name === 'SaveImapSmtpCaldavAccount',
      ).length,
    ).toBe(1);

    // And re-reading never re-authorises the creation: the account may exist,
    // and nothing here could delete a second one.
    expect(result.current.canRetryWrite).toBe(false);
  });
});
