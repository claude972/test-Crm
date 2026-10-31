import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

import { useHermesRuntimeNativeAccounts } from '@/hermes-admin-runtime/hooks/useHermesRuntimeNativeAccounts';
import { HermesMailboxSetupPanel } from '@/hermes-mailbox-setup/components/HermesMailboxSetupPanel';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';
import { SaveImapSmtpCaldavAccountDocument } from '~/generated-metadata/graphql';

// ENVIRONMENT GAP, not product behaviour: jsdom defines no PointerEvent, and
// the design system's controls from @base-ui/react dispatch one, which throws
// `ownerWindow(...).PointerEvent is not a constructor`. The constructor is
// supplied here so a real click can be delivered.
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

// HARNESS SUBSTITUTION: the toast host is an application-level provider. The
// panel's own reporting is rendered text, which is what the assertions read,
// so the toast is replaced rather than mounted.
const enqueueToast = jest.fn();

jest.mock('kovaa-lab-ui/components/feedback', () => ({
  useToast: () => ({ enqueueToast }),
}));

const NEW_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const MAILBOX = 'contact@atelier-fontaine.example';
const IMAP_HOST = 'imap.atelier-fontaine.example';
const SMTP_HOST = 'smtp.atelier-fontaine.example';
const TYPED_PASSWORD = 'mot-de-passe-saisi-une-seule-fois';

// The account the server reports AFTER the creation. There is no password in
// this shape, because the query does not select one and the server never
// returns one.
const createdAccountRow = {
  __typename: 'ConnectedAccount',
  id: NEW_ACCOUNT_ID,
  handle: MAILBOX,
  // The enum itself, not a hand-written string: the centre filters the list on
  // this value, and its wire form is lowercase.
  provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
  name: 'Atelier Fontaine',
  archivedAt: null,
  authFailedAt: null,
};

type AccountsReadLog = { count: number };

// The workspace starts with NO mail account: the first read of the list the
// centre uses returns an empty list. A pre-seeded account would prove nothing
// about the gap this panel closes.
const buildAccountsMocks = (log: AccountsReadLog): MockedResponse[] => [
  {
    request: { query: GET_MY_CONNECTED_ACCOUNTS },
    maxUsageCount: 1,
    result: () => {
      log.count += 1;
      return { data: { myConnectedAccounts: [] } };
    },
  },
  {
    request: { query: GET_MY_CONNECTED_ACCOUNTS },
    maxUsageCount: 10,
    result: () => {
      log.count += 1;
      return { data: { myConnectedAccounts: [createdAccountRow] } };
    },
  },
];

const buildSaveMock = (
  variablesSpy: jest.Mock,
  result: { success: boolean; connectedAccountId: string | null },
): MockedResponse => ({
  request: {
    query: SaveImapSmtpCaldavAccountDocument,
    // Apollo 4 takes the matcher here; it records what actually left the
    // client so the assertions can read the real payload.
    variables: (variables) => {
      variablesSpy(variables);
      return true;
    },
  },
  maxUsageCount: 10,
  result: {
    data: {
      saveImapSmtpCaldavAccount: {
        __typename: 'ImapSmtpCaldavConnectionSuccess',
        success: result.success,
        connectedAccountId: result.connectedAccountId,
      },
    },
  },
});

// An answer the server ANSWERED with errors, in the shape its error envelope
// puts on the wire: the code sits in each error's `extensions`. A null code
// stands for an error the envelope left unclassified. MockLink delivers this
// through `result`, which is a received answer — not `error`, which is a
// request that never got one.
const buildSaveErrorMock = ({
  code,
  message,
  variablesSpy,
}: {
  code: string | null;
  message: string;
  variablesSpy?: jest.Mock;
}): MockedResponse => ({
  request: {
    query: SaveImapSmtpCaldavAccountDocument,
    variables: (variables) => {
      variablesSpy?.(variables);
      return true;
    },
  },
  maxUsageCount: 10,
  result: {
    errors: [{ message, ...(code === null ? {} : { extensions: { code } }) }],
  },
});

// A stand-in for the centre: it reads the selectable accounts with the centre's
// own hook, binds MAIL to whatever the panel hands it, and renders both. The
// MAIL write itself belongs to the runtime module, so the binding is recorded
// here rather than re-implemented.
const CentreHarness = ({
  onBindMail,
}: {
  onBindMail: (connectedAccountId: string) => void;
}) => {
  const { nativeAccounts } = useHermesRuntimeNativeAccounts();

  return (
    <div>
      <ul aria-label="comptes-selectionnables">
        {nativeAccounts.map((account) => (
          <li key={account.id}>{account.address ?? account.id}</li>
        ))}
      </ul>
      <HermesMailboxSetupPanel
        hasExistingAccounts={nativeAccounts.length > 0}
        onConnected={onBindMail}
      />
    </div>
  );
};

const renderPanel = (mocks: MockedResponse[], onBindMail = jest.fn()) => {
  render(
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>
        <CentreHarness onBindMail={onBindMail} />
      </I18nProvider>
    </MockedProvider>,
  );

  return { onBindMail };
};

// A mailbox the centre can actually bind: both protocols. The server creates
// the native message channel only for a submission carrying IMAP, and refuses
// a MAIL connection that cannot send, so neither protocol alone is a complete
// mailbox here.
const fillCompleteMailbox = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.type(screen.getByLabelText(/Email Address/i), MAILBOX);
  await user.type(screen.getByLabelText(/IMAP Server/i), IMAP_HOST);
  await user.type(screen.getByLabelText(/IMAP Password/i), TYPED_PASSWORD);
  await user.type(screen.getByLabelText(/SMTP Server/i), SMTP_HOST);
  await user.type(screen.getByLabelText(/SMTP Password/i), TYPED_PASSWORD);
};

describe('HermesMailboxSetupPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers an entry point when the workspace has no mail account at all', async () => {
    const log: AccountsReadLog = { count: 0 };
    renderPanel(buildAccountsMocks(log));

    await waitFor(() => {
      expect(
        screen.getByText(/Aucune boîte mail n’est encore enregistrée/),
      ).toBeInTheDocument();
    });

    // The defect being closed: the centre used to stop at this sentence.
    expect(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email Address/i)).not.toBeInTheDocument();
  });

  it('creates the first mailbox through the native path, refreshes the list and hands the id up for the MAIL binding', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const variablesSpy = jest.fn();
    const onBindMail = jest.fn();

    renderPanel(
      [
        ...buildAccountsMocks(log),
        buildSaveMock(variablesSpy, {
          success: true,
          connectedAccountId: NEW_ACCOUNT_ID,
        }),
      ],
      onBindMail,
    );

    // The list the centre reads really is empty to begin with.
    await waitFor(() => {
      expect(log.count).toBe(1);
    });
    expect(
      screen.getByRole('list', { name: 'comptes-selectionnables' }),
    ).toBeEmptyDOMElement();

    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );

    // The native field set, not a re-authored one.
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();

    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    await waitFor(() => {
      expect(onBindMail).toHaveBeenCalledWith(NEW_ACCOUNT_ID);
    });

    // The write went to the native mutation, with the password typed in this
    // session and nothing invented around it.
    expect(variablesSpy).toHaveBeenCalledTimes(1);
    const variables = variablesSpy.mock.calls[0][0];
    expect(variables.handle).toBe(MAILBOX);
    expect(variables.connectionParameters.IMAP.host).toBe(IMAP_HOST);
    expect(variables.connectionParameters.IMAP.password).toBe(TYPED_PASSWORD);
    // Sending too, because the MAIL connection requires both protocols.
    expect(variables.connectionParameters.SMTP.host).toBe(SMTP_HOST);
    expect(variables.connectionParameters.SMTP.password).toBe(TYPED_PASSWORD);
    // No second store, and no protocol invented from defaults alone: CalDAV
    // was never filled, so nothing about it leaves.
    expect(variables.connectionParameters.CALDAV).toBeUndefined();
    expect(variables.id).toBeUndefined();

    // An accepted write is followed by a re-read, so the centre stops showing
    // a state the server no longer holds.
    await waitFor(() => {
      expect(log.count).toBeGreaterThanOrEqual(2);
    });
    expect(await screen.findByText(MAILBOX)).toBeInTheDocument();
  });

  it('reports a saved mailbox as unverified, never as connected', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };

    renderPanel([
      ...buildAccountsMocks(log),
      buildSaveMock(jest.fn(), {
        success: true,
        connectedAccountId: NEW_ACCOUNT_ID,
      }),
    ]);

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    const note = await screen.findByRole('status');
    // The three states are named apart: recorded, reachable, proven-flowing.
    expect(note).toHaveTextContent(/enregistrée, non vérifiée/);
    expect(note).toHaveTextContent(/joignabilité n’est pas établie/);
    expect(note).toHaveTextContent(/aucun échange de courrier n’a été prouvé/);
    expect(note.textContent).not.toMatch(/connectée|vérifiée avec succès/);
  });

  it('keeps an unreadable answer apart from a success and warns against a duplicate', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const onBindMail = jest.fn();

    renderPanel(
      [
        ...buildAccountsMocks(log),
        // Accepted-looking reply with no account id: nothing can be bound.
        buildSaveMock(jest.fn(), { success: true, connectedAccountId: null }),
      ],
      onBindMail,
    );

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/n’est ni confirmé ni infirmé/);
    expect(alert).toHaveTextContent(/pour ne pas créer de doublon/);
    expect(onBindMail).not.toHaveBeenCalled();
  });

  it('refuses to send before the address and one protocol are complete', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const variablesSpy = jest.fn();

    renderPanel([
      ...buildAccountsMocks(log),
      buildSaveMock(variablesSpy, {
        success: true,
        connectedAccountId: NEW_ACCOUNT_ID,
      }),
    ]);

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );

    const save = screen.getByRole('button', { name: /Enregistrer la boîte/ });
    expect(save).toBeDisabled();

    // A host without the password typed this session is not a configured
    // protocol on creation, so the save stays closed.
    await user.type(screen.getByLabelText(/Email Address/i), MAILBOX);
    await user.type(screen.getByLabelText(/IMAP Server/i), IMAP_HOST);
    expect(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    ).toBeDisabled();
    expect(variablesSpy).not.toHaveBeenCalled();
  });

  it('keeps an accepted write that could not be re-read out of the refusal path, and never invites a duplicate', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const onBindMail = jest.fn();

    renderPanel(
      [
        // The empty first read.
        {
          request: { query: GET_MY_CONNECTED_ACCOUNTS },
          maxUsageCount: 1,
          result: () => {
            log.count += 1;
            return { data: { myConnectedAccounts: [] } };
          },
        },
        // The re-read that follows the ACCEPTED write, and fails.
        {
          request: { query: GET_MY_CONNECTED_ACCOUNTS },
          maxUsageCount: 1,
          error: new Error('liste indisponible'),
        },
        // The re-read the operator asks for afterwards, which succeeds.
        {
          request: { query: GET_MY_CONNECTED_ACCOUNTS },
          maxUsageCount: 10,
          result: () => {
            log.count += 1;
            return { data: { myConnectedAccounts: [createdAccountRow] } };
          },
        },
        buildSaveMock(jest.fn(), {
          success: true,
          connectedAccountId: NEW_ACCOUNT_ID,
        }),
      ],
      onBindMail,
    );

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    const note = await screen.findByRole('status');
    // The account exists. Saying nothing was written would push the operator
    // into creating it a second time.
    expect(note).toHaveTextContent(/enregistrée, non vérifiée/);
    expect(note).toHaveTextContent(/n’a pas pu être relue/);
    expect(note).toHaveTextContent(/ne le recréez pas/);
    expect(note.textContent).not.toMatch(/Rien n’a été écrit|a refusé/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The id is established, so the MAIL binding still gets it.
    expect(onBindMail).toHaveBeenCalledWith(NEW_ACCOUNT_ID);

    // The offered recovery is a re-read, not another write.
    await user.click(
      screen.getByRole('button', { name: /Relire la liste des comptes/ }),
    );

    expect(await screen.findByText(MAILBOX)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Relire la liste des comptes/ }),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps a server refusal a refusal, and binds nothing', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const onBindMail = jest.fn();

    renderPanel(
      [
        ...buildAccountsMocks(log),
        buildSaveMock(jest.fn(), {
          success: false,
          connectedAccountId: null,
        }),
      ],
      onBindMail,
    );

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/a refusé l’enregistrement/);
    expect(alert).not.toHaveTextContent(/ni confirmé ni infirmé/);
    expect(onBindMail).not.toHaveBeenCalled();
  });

  it('treats a lost response as unknown, withholds a second send and offers only a re-read', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const onBindMail = jest.fn();
    const saveSpy = jest.fn();

    renderPanel(
      [
        ...buildAccountsMocks(log),
        {
          request: {
            query: SaveImapSmtpCaldavAccountDocument,
            variables: (variables) => {
              saveSpy(variables);
              return true;
            },
          },
          maxUsageCount: 10,
          error: new Error('socket hang up'),
        },
      ],
      onBindMail,
    );

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    const alert = await screen.findByRole('alert');
    // A dropped response does not prove a refusal: the server may have applied
    // the write, so claiming nothing was written would invite a duplicate.
    expect(alert).toHaveTextContent(
      /nous ne savons pas si la boîte a été enregistrée/,
    );
    expect(alert).toHaveTextContent(/Ne la recréez pas/);
    expect(alert.textContent).not.toMatch(/Rien n’a été écrit|a refusé/);
    expect(enqueueToast).toHaveBeenCalled();
    expect(onBindMail).not.toHaveBeenCalled();

    // No way to send again is offered at all.
    expect(
      screen.queryByRole('button', { name: /Enregistrer la boîte/ }),
    ).not.toBeInTheDocument();

    // The only recovery re-reads, and writes nothing more.
    await user.click(
      screen.getByRole('button', { name: /Relire la liste des comptes/ }),
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /La liste des comptes a été relue/,
      );
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  // Each pre-write code is raised before the native resolver reaches its
  // transaction: the guards and the validation pipe run before the method
  // body, and the resolver's own pre-write throws carry these. They stay the
  // only answers this screen reports as a refusal.
  it.each(['UNAUTHENTICATED', 'FORBIDDEN', 'BAD_USER_INPUT', 'NOT_FOUND'])(
    'keeps a %s answer a proven refusal, and offers the correction again',
    async (code) => {
      const user = userEvent.setup();
      const log: AccountsReadLog = { count: 0 };
      const onBindMail = jest.fn();

      renderPanel(
        [
          ...buildAccountsMocks(log),
          buildSaveErrorMock({ code, message: 'hôte SMTP interdit' }),
        ],
        onBindMail,
      );

      await waitFor(() => expect(log.count).toBe(1));
      await user.click(
        screen.getByRole('button', { name: /Connecter une boîte/ }),
      );
      await fillCompleteMailbox(user);
      await user.click(
        screen.getByRole('button', { name: /Enregistrer la boîte/ }),
      );

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/a refusé l’enregistrement/);
      expect(alert.textContent).not.toMatch(
        /nous ne savons pas si la boîte a été enregistrée/,
      );
      expect(onBindMail).not.toHaveBeenCalled();
      // A refusal proven before the write may be corrected and sent again.
      expect(
        screen.getByRole('button', { name: /Enregistrer la boîte/ }),
      ).toBeInTheDocument();
    },
  );

  // THE CASE THIS LOT EXISTS FOR. `upsertConnectedAccount` commits its
  // transaction, THEN awaits removeAccountToReconnect, a findOne, two sync
  // resets and two queue enqueues. A throw in any of them surfaces as a
  // perfectly valid INTERNAL_SERVER_ERROR over an account that WAS saved, so
  // the answer below is a written mailbox, not a refused one.
  it.each([
    ['INTERNAL_SERVER_ERROR', 'INTERNAL_SERVER_ERROR'],
    ['a code this screen cannot place before the write', 'CONFLICT'],
    ['no code at all', null],
  ])(
    'treats %s as write-unknown and offers no re-emission',
    async (_label, code) => {
      const user = userEvent.setup();
      const log: AccountsReadLog = { count: 0 };
      const onBindMail = jest.fn();
      const saveSpy = jest.fn();

      renderPanel(
        [
          ...buildAccountsMocks(log),
          buildSaveErrorMock({
            code,
            message: 'Cannot read properties of undefined',
            variablesSpy: saveSpy,
          }),
        ],
        onBindMail,
      );

      await waitFor(() => expect(log.count).toBe(1));
      await user.click(
        screen.getByRole('button', { name: /Connecter une boîte/ }),
      );
      await fillCompleteMailbox(user);
      await user.click(
        screen.getByRole('button', { name: /Enregistrer la boîte/ }),
      );

      const alert = await screen.findByRole('alert');
      // The account may exist, so the screen says so instead of claiming a
      // refusal, and points at the read that settles it.
      expect(alert).toHaveTextContent(
        /nous ne savons pas si la boîte a été enregistrée/,
      );
      expect(alert).toHaveTextContent(/Ne la recréez pas/);
      expect(alert.textContent).not.toMatch(/Rien n’a été écrit|a refusé/);
      expect(onBindMail).not.toHaveBeenCalled();

      // No re-emission is offered at all: a second send could create the very
      // duplicate the unknown outcome is about.
      expect(
        screen.queryByRole('button', { name: /Enregistrer la boîte/ }),
      ).not.toBeInTheDocument();

      // The only recovery re-reads the list, and writes nothing more.
      await user.click(
        screen.getByRole('button', { name: /Relire la liste des comptes/ }),
      );
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /La liste des comptes a été relue/,
        );
      });
      expect(saveSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('does not let a throwing consumer rewrite the server’s verdict', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const onBindMail = jest.fn(() => {
      throw new Error('le centre a échoué à lier MAIL');
    });

    renderPanel(
      [
        ...buildAccountsMocks(log),
        buildSaveMock(jest.fn(), {
          success: true,
          connectedAccountId: NEW_ACCOUNT_ID,
        }),
      ],
      onBindMail,
    );

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    await waitFor(() => {
      expect(onBindMail).toHaveBeenCalledWith(NEW_ACCOUNT_ID);
    });

    // The write was accepted. A listener blowing up afterwards is its own
    // failure and must not turn the acceptance into a refusal.
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent(/enregistrée, non vérifiée/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(enqueueToast).toHaveBeenCalled();
  });

  it('says what the native « Name » field becomes, since its placeholder suggests a person', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };

    renderPanel(buildAccountsMocks(log));

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );

    // The native placeholder is a contact's name; the label it actually feeds
    // is the mailbox's in the connections list.
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      /nommez la boîte de la société, pas une personne/,
    );
  });

  it('clears the typed password from the form once the server holds it', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };

    renderPanel([
      ...buildAccountsMocks(log),
      buildSaveMock(jest.fn(), {
        success: true,
        connectedAccountId: NEW_ACCOUNT_ID,
      }),
    ]);

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    await fillCompleteMailbox(user);
    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    // Reopening offers an empty form: no credential is kept client side.
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('');
    expect(screen.getByLabelText(/IMAP Server/i)).toHaveValue('');
  });

  // The contract: a MAIL connection needs BOTH protocols. The server creates
  // the native message channel the campaign sender is resolved from only for a
  // submission carrying IMAP, so an SMTP-only account is created and then
  // cannot serve. The rule is the server's; these say it is legible here.
  it('refuses an SMTP-only mailbox and says which protocol is missing and why', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const variablesSpy = jest.fn();

    renderPanel([
      ...buildAccountsMocks(log),
      buildSaveMock(variablesSpy, {
        success: true,
        connectedAccountId: NEW_ACCOUNT_ID,
      }),
    ]);

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );

    await user.type(screen.getByLabelText(/Email Address/i), MAILBOX);
    await user.type(screen.getByLabelText(/SMTP Server/i), SMTP_HOST);
    await user.type(screen.getByLabelText(/SMTP Password/i), TYPED_PASSWORD);

    // The requirement is stated with its reason, not carried by a disabled
    // button alone, and it names the protocol that is missing.
    const rule = screen.getByText(/Cette boîte doit porter la réception/);
    expect(rule).toHaveTextContent(/Il manque IMAP/);
    expect(rule).toHaveTextContent(/canal natif/);

    // And this is the state that must never read as a usable mail connection.
    expect(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    );

    // Nothing left the client, so no account exists to be stranded.
    expect(variablesSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/enregistrée, non vérifiée/)).toBeNull();
  });

  it('refuses an IMAP-only mailbox and names SMTP as the missing half', async () => {
    const user = userEvent.setup();
    const log: AccountsReadLog = { count: 0 };
    const variablesSpy = jest.fn();

    renderPanel([
      ...buildAccountsMocks(log),
      buildSaveMock(variablesSpy, {
        success: true,
        connectedAccountId: NEW_ACCOUNT_ID,
      }),
    ]);

    await waitFor(() => expect(log.count).toBe(1));
    await user.click(
      screen.getByRole('button', { name: /Connecter une boîte/ }),
    );

    await user.type(screen.getByLabelText(/Email Address/i), MAILBOX);
    await user.type(screen.getByLabelText(/IMAP Server/i), IMAP_HOST);
    await user.type(screen.getByLabelText(/IMAP Password/i), TYPED_PASSWORD);

    expect(
      screen.getByText(/Cette boîte doit porter la réception/),
    ).toHaveTextContent(/Il manque SMTP/);

    expect(
      screen.getByRole('button', { name: /Enregistrer la boîte/ }),
    ).toBeDisabled();
    expect(variablesSpy).not.toHaveBeenCalled();
  });
});
