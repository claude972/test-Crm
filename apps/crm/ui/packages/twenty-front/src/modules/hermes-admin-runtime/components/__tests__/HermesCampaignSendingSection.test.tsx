import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { configure, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import { ToastProvider } from 'kovaa-lab-ui/components/feedback';

import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import { HermesCampaignSendingSection } from '@/hermes-admin-runtime/components/HermesCampaignSendingSection';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
import {
  EmailingDomainStatus,
  GetEmailingDomainsDocument,
  UnsubscribeHostnameStatus,
} from '~/generated-metadata/graphql';

// RTL's `asyncUtilTimeout` governs how long a `findBy*` or a `waitFor` waits
// for something that is genuinely on its way. It defaults to 1000 ms and is
// unset repo-wide, so a loaded machine blows it long before the 30 s per-test
// budget is touched — and the failure then reads « Unable to find an element »,
// an assertion failure, rather than a timeout. That is the shape of the
// intermittent red this suite showed under contention.
//
// Scoped to this file, and it does NOT relax the per-test limit: a query still
// resolves the moment the element appears, so a fast machine pays nothing and
// a genuinely missing element still fails.
configure({ asyncUtilTimeout: 5000 });

const ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const MAILBOX = 'contact@atelier.example';

// The central MAIL connection as the store publishes it: a list of JSONObject,
// so there is no selection set and the payload is reduced on arrival.
const mailConnection = {
  kind: 'MAIL',
  connectionId: 'connection-mail',
  revision: 3,
  state: 'CONFIGURED_UNVERIFIED',
  settings: {
    connectedAccountId: ACCOUNT_ID,
    mailbox: 'INBOX',
    handle: MAILBOX,
  },
  secretFields: [],
  updatedAt: '2026-10-29T10:00:00.000Z',
};

const connectionsMock = (
  payload: unknown = [mailConnection],
): MockedResponse => ({
  request: { query: HERMES_CONNECTIONS_V4 },
  maxUsageCount: 10,
  result: { data: { hermesConnectionsV4: payload } },
});

const emailingDomain = (
  overrides: Partial<{
    domain: string;
    status: EmailingDomainStatus;
    unsubscribeHostnameStatus: UnsubscribeHostnameStatus;
  }> = {},
) => ({
  __typename: 'EmailingDomain',
  id: 'domain-1',
  domain: overrides.domain ?? 'atelier.example',
  status: overrides.status ?? EmailingDomainStatus.VERIFIED,
  unsubscribeHostnameStatus:
    overrides.unsubscribeHostnameStatus ?? UnsubscribeHostnameStatus.ACTIVE,
  verifiedAt: '2026-10-28T09:00:00.000Z',
  createdAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-28T09:00:00.000Z',
  verificationRecords: [],
});

const domainsMock = (domains: unknown[]): MockedResponse => ({
  request: { query: GetEmailingDomainsDocument },
  maxUsageCount: 10,
  result: { data: { getEmailingDomains: domains } },
});

const renderSection = ({
  mocks,
  accounts = [
    {
      id: ACCOUNT_ID,
      handle: MAILBOX,
      archivedAt: null,
      handleAliases: [],
    },
  ],
}: {
  mocks: MockedResponse[];
  accounts?: unknown[] | null;
}) => {
  const store = createStore();
  store.set(myConnectedAccountsState.atom, accounts as never);

  return render(
    <Provider store={store}>
      <MockedProvider mocks={mocks}>
        <I18nProvider i18n={i18n}>
          {/* HARNESS: the toast host is an application-level provider, mounted
              in App.tsx. The native verify button the domain panel reuses
              calls useToast, so the real provider is used rather than a stub. */}
          <ToastProvider>
            <MemoryRouter>
              <HermesCampaignSendingSection />
            </MemoryRouter>
          </ToastProvider>
        </I18nProvider>
      </MockedProvider>
    </Provider>,
  );
};

describe('HermesCampaignSendingSection', () => {
  it('names the registered mailbox and refuses to call recording an authorisation', async () => {
    renderSection({
      mocks: [connectionsMock(), domainsMock([emailingDomain()])],
    });

    expect(
      await screen.findByText(new RegExp(`Registered mailbox: ${MAILBOX}`)),
    ).toBeInTheDocument();

    // The point the owner keeps having to restate: a recorded sender is not a
    // permission, and the screen says so in the same breath.
    expect(
      screen.getByText(/Recording it is not an authorisation/),
    ).toBeInTheDocument();

    // The domain's state comes from the server's own record and its own label.
    expect(await screen.findByText('Verified')).toBeInTheDocument();
  });

  it('says no mailbox is registered when no central connection is configured', async () => {
    renderSection({
      mocks: [
        connectionsMock([
          { ...mailConnection, connectionId: null, state: 'NOT_CONFIGURED' },
        ]),
      ],
    });

    expect(
      await screen.findByText(/No incoming-mail connection is configured/),
    ).toBeInTheDocument();

    // No address is proposed, and no domain is claimed either.
    expect(screen.queryByText(new RegExp(MAILBOX))).toBeNull();
  });

  it('leaves the mailbox unknown when the central read cannot be understood', async () => {
    // A payload that is not the published shape. It is neither an absence nor a
    // configuration: it is unreadable, and that is what gets said.
    renderSection({ mocks: [connectionsMock({ unexpected: true })] });

    expect(
      await screen.findByText(
        /The registered mailbox could not be read, so it is unknown which address a campaign may send from/,
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText(new RegExp(MAILBOX))).toBeNull();
  });

  it('proposes no mailbox when the connection names an account that does not answer', async () => {
    // The dangerous case: a connection exists and no native account matches it.
    renderSection({ mocks: [connectionsMock()], accounts: [] });

    expect(
      await screen.findByText(
        /no native account answers to it — the binding moved, or the account was renamed/,
      ),
    ).toBeInTheDocument();
  });

  it('does not treat an unlisted domain as refused or as verified', async () => {
    renderSection({
      mocks: [
        connectionsMock(),
        domainsMock([emailingDomain({ domain: 'autre.example' })]),
      ],
    });

    expect(
      await screen.findByText(
        /No emailing domain record covers atelier\.example/,
      ),
    ).toBeInTheDocument();

    // An absent record is not a verdict: no status label is shown for it.
    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.queryByText('Failed')).toBeNull();
  });

  it('says a verified domain still lacks its unsubscribe record', async () => {
    renderSection({
      mocks: [
        connectionsMock(),
        domainsMock([
          emailingDomain({
            unsubscribeHostnameStatus: UnsubscribeHostnameStatus.PENDING,
          }),
        ]),
      ],
    });

    expect(await screen.findByText('Verified')).toBeInTheDocument();

    expect(
      screen.getByText(/The unsubscribe record of this domain is not active/),
    ).toBeInTheDocument();
  });

  it('offers the two surfaces that operate the sender, as real links', async () => {
    renderSection({
      mocks: [connectionsMock(), domainsMock([emailingDomain()])],
    });

    await screen.findByText(new RegExp(`Registered mailbox: ${MAILBOX}`));

    expect(
      screen.getByRole('link', { name: /Mailbox and connections/ }),
    ).toHaveAttribute('href', '/hermes/connexions');

    expect(screen.getByRole('link', { name: /Campaigns/ })).toHaveAttribute(
      'href',
      '/hermes/campagnes',
    );
  });
});
