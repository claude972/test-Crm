import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from 'kovaa-lab-ui/components/feedback';

import {
  HermesCampaignDomainPanel,
  type HermesCampaignDomainRecord,
} from '@/hermes-admin-runtime/components/HermesCampaignDomainPanel';
import { HERMES_CREATE_EMAILING_DOMAIN } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesCreateEmailingDomain';
import {
  EmailingDomainStatus,
  UnsubscribeHostnameStatus,
} from '~/generated-metadata/graphql';

// ENVIRONMENT GAP, not product behaviour: jsdom defines no PointerEvent, and
// the design system's controls from @base-ui/react dispatch one.
if (typeof window !== 'undefined' && window.PointerEvent === undefined) {
  class PointerEventPolyfill extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventPolyfill,
    writable: true,
  });
}

const DOMAIN = 'atelier.example';

// The matcher lives INSIDE request.variables: a top-level variableMatcher is
// not read by MockLink, and the exact match is itself the assertion that this
// panel sends the mailbox's own domain and nothing else.
const createMock = (): MockedResponse => ({
  request: {
    query: HERMES_CREATE_EMAILING_DOMAIN,
    variables: { input: { domain: DOMAIN } },
  },
  result: {
    data: {
      createEmailingDomain: {
        __typename: 'EmailingDomain',
        id: 'domain-1',
        domain: DOMAIN,
        // The server answers PENDING. Recording is not verifying.
        status: EmailingDomainStatus.PENDING,
        unsubscribeHostnameStatus: UnsubscribeHostnameStatus.PENDING,
        verifiedAt: null,
        verificationRecords: [],
        createdAt: '2026-10-31T09:00:00.000Z',
        updatedAt: '2026-10-31T09:00:00.000Z',
      },
    },
  },
});

// A refusal must carry a code. A bare `new Error('Unauthorized')` reads as a
// transport failure, not as a denial, so it would prove the opposite.
const refusalMock = (): MockedResponse => ({
  request: {
    query: HERMES_CREATE_EMAILING_DOMAIN,
    variables: { input: { domain: DOMAIN } },
  },
  result: {
    errors: [
      {
        message: 'PERMISSION_DENIED',
        extensions: { code: 'FORBIDDEN' },
      },
    ],
  },
});

// A lost answer. `error:` is what makes MockLink reject; a throw inside
// `result` would not.
const lostAnswerMock = (): MockedResponse => ({
  request: {
    query: HERMES_CREATE_EMAILING_DOMAIN,
    variables: { input: { domain: DOMAIN } },
  },
  error: new Error('socket hang up'),
});

// An answer the server DID return, carrying nothing we can read a domain out
// of. It is neither a success nor a refusal, and the record may well exist.
const unreadableAnswerMock = (): MockedResponse => ({
  request: {
    query: HERMES_CREATE_EMAILING_DOMAIN,
    variables: { input: { domain: DOMAIN } },
  },
  maxUsageCount: 10,
  result: { data: { createEmailingDomain: null } },
});

const renderPanel = ({
  record = null,
  mocks = [],
  refetchDomains = jest.fn(() => Promise.resolve()),
}: {
  record?: HermesCampaignDomainRecord | null;
  mocks?: MockedResponse[];
  refetchDomains?: () => Promise<unknown>;
} = {}) => {
  render(
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>
        <ToastProvider>
          <HermesCampaignDomainPanel
            domain={DOMAIN}
            record={record}
            refetchDomains={refetchDomains}
          />
        </ToastProvider>
      </I18nProvider>
    </MockedProvider>,
  );

  return { refetchDomains };
};

const readyRecord: HermesCampaignDomainRecord = {
  id: 'domain-1',
  domain: DOMAIN,
  status: EmailingDomainStatus.VERIFIED,
  unsubscribeHostnameStatus: UnsubscribeHostnameStatus.ACTIVE,
  verificationRecords: [],
};

describe('HermesCampaignDomainPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers the recording and does not call it a verification', async () => {
    renderPanel();

    expect(
      screen.getByText(
        /Recording it creates the domain; it does not verify it/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Record this domain' }),
    ).toBeInTheDocument();
  });

  it('records the mailbox own domain, then re-reads, and claims nothing more', async () => {
    const { refetchDomains } = renderPanel({ mocks: [createMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    // The re-read is what puts the server's own record on screen. The mock
    // matching on the exact variables is the proof the sent domain was the
    // mailbox's, not something composed here.
    await waitFor(() => {
      expect(refetchDomains).toHaveBeenCalledTimes(1);
    });

    // The honest success, said in the negative: recorded, NOT verified. The
    // loose /verified/i this replaced matched that very negation.
    expect(
      await screen.findByText(/Domain recorded, not verified/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/is verified|successfully verified/i),
    ).toBeNull();
  });

  it('reports a refusal as a refusal, with the server wording', async () => {
    renderPanel({ mocks: [refusalMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    expect(
      await screen.findByText(/The server refused to record this domain/),
    ).toBeInTheDocument();

    // A refusal means nothing was written, so it is never reported as recorded.
    expect(screen.queryByText(/Domain recorded/)).toBeNull();
  });

  it('offers no re-emission when the answer was lost, only a re-read', async () => {
    const { refetchDomains } = renderPanel({ mocks: [lostAnswerMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    expect(
      await screen.findByText(
        /we do not know whether the domain was recorded. Do not record it again/,
      ),
    ).toBeInTheDocument();

    // The dangerous control is withdrawn: sending again could create a second
    // record for the same domain.
    expect(
      screen.queryByRole('button', { name: 'Record this domain' }),
    ).toBeNull();

    const reread = screen.getByRole('button', {
      name: 'Re-read the domains',
    });

    await userEvent.click(reread);

    await waitFor(() => {
      expect(refetchDomains).toHaveBeenCalledTimes(1);
    });

    // The wording moves on to say the re-read happened, and still does not
    // claim the recording did.
    expect(
      await screen.findByText(/The domains have been re-read/),
    ).toBeInTheDocument();
  });

  it('hands the check to the server and offers the re-read that shows its verdict', async () => {
    const { refetchDomains } = renderPanel({
      record: {
        ...readyRecord,
        status: EmailingDomainStatus.PENDING,
        unsubscribeHostnameStatus: UnsubscribeHostnameStatus.PENDING,
      },
    });

    expect(
      screen.getByText(/The verdict is the server's, not this form's/),
    ).toBeInTheDocument();

    // The native button, reused rather than reimplemented.
    expect(
      screen.getByRole('button', { name: /Check verification/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Re-read the domains' }),
    );

    await waitFor(() => {
      expect(refetchDomains).toHaveBeenCalledTimes(1);
    });
  });

  it('asks for no DNS record the server did not publish', async () => {
    renderPanel({
      record: {
        ...readyRecord,
        status: EmailingDomainStatus.PENDING,
        unsubscribeHostnameStatus: UnsubscribeHostnameStatus.PENDING,
        verificationRecords: [],
      },
    });

    // A company sending through its own SMTP mailbox is authorised through that
    // mailbox, so no DNS block is shown when the server published none.
    expect(screen.queryByText('Domain authentication')).toBeNull();
  });

  it('shows the published DNS records when the server did publish some', async () => {
    renderPanel({
      record: {
        ...readyRecord,
        status: EmailingDomainStatus.PENDING,
        unsubscribeHostnameStatus: UnsubscribeHostnameStatus.PENDING,
        verificationRecords: [
          {
            __typename: 'VerificationRecord',
            type: 'TXT',
            key: DOMAIN,
            value: 'v=spf1 include:example -all',
            priority: null,
            status: 'pending',
          },
        ],
      },
    });

    expect(screen.getByText('Domain authentication')).toBeInTheDocument();
  });

  it('renders nothing once the server reports the domain ready', async () => {
    renderPanel({ record: readyRecord });

    expect(
      screen.queryByRole('button', { name: /Check verification/ }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Record this domain' }),
    ).toBeNull();
  });

  // The defect root's review found: the control withheld the write for three
  // named uncertain outcomes and let `unconfirmed` through, so a write that may
  // have landed was sendable again. The rule is now an allowlist of PROVEN
  // settled outcomes, so an unforeseen state fails closed.
  it('withdraws the write on an unreadable answer and requires a re-read first', async () => {
    const { refetchDomains } = renderPanel({ mocks: [unreadableAnswerMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    expect(
      await screen.findByText(
        /neither confirmed nor denied. Do not record it again/,
      ),
    ).toBeInTheDocument();

    // The duplicate hazard: this must not be pressable again.
    expect(
      screen.queryByRole('button', { name: 'Record this domain' }),
    ).toBeNull();

    const reread = screen.getByRole('button', {
      name: 'Re-read the domains',
    });

    await userEvent.click(reread);

    await waitFor(() => {
      expect(refetchDomains).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText(/The domains have been re-read/),
    ).toBeInTheDocument();
  });

  it('withdraws the write when an accepted record still does not appear', async () => {
    // The server accepted and the re-read succeeded, yet the record is absent
    // from the list. Not a settled state: re-read, never create again.
    const { refetchDomains } = renderPanel({ mocks: [createMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    expect(
      await screen.findByText(
        /The server accepted it, and it still does not appear in the list read back/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Record this domain' }),
    ).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'Re-read the domains' }),
    );

    await waitFor(() => {
      expect(refetchDomains).toHaveBeenCalledTimes(2);
    });
  });

  it('offers the write again after a proven refusal, which wrote nothing', async () => {
    renderPanel({ mocks: [refusalMock()] });

    await userEvent.click(
      screen.getByRole('button', { name: 'Record this domain' }),
    );

    await screen.findByText(/The server refused to record this domain/);

    // A pre-write refusal is settled: nothing was written, so the correction
    // is offered rather than withheld.
    expect(
      screen.getByRole('button', { name: 'Record this domain' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Re-read the domains' }),
    ).toBeNull();
  });
});
