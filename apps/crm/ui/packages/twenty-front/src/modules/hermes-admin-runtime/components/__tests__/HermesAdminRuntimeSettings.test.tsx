import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';

import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { HERMES_REMOVE_CONNECTION_V4 } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesRemoveConnectionV4';
import { HERMES_SAVE_CONNECTION_V4 } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesSaveConnectionV4';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesConnectionsV4';
import { HermesAdminRuntimeSettings } from '@/hermes-admin-runtime/components/HermesAdminRuntimeSettings';
import { HERMES_WORKSPACE_BOT_POLICIES } from '@/hermes-bot-settings/graphql/metadata-queries/hermesWorkspaceBotPolicies';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';

// The authentication hook is not re-implemented and not exercised here: this
// container only calls its two company methods and maps their promises. They
// are replaced so the journey under test is the connections one, and so no
// token, session or redirect is touched by a test.
const selectWorkspaceOnSameOrigin = jest.fn(() => Promise.resolve());
const createWorkspaceOnSameOrigin = jest.fn(() => Promise.resolve());

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    selectWorkspaceOnSameOrigin,
    createWorkspaceOnSameOrigin,
  }),
}));

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

// The views the central store publishes, one per kind. `revision` is an Int,
// `secretFields` carries field NAMES only, and the only configured state is
// CONFIGURED_UNVERIFIED — there is no VERIFIED in this contract.
const connectionsPayload = [
  {
    kind: 'EVOLUTION',
    connectionId: 'connection-evolution',
    revision: 4,
    state: 'CONFIGURED_UNVERIFIED',
    settings: { baseUrl: 'https://evolution.example.com', instanceName: 'atelier' },
    secretFields: ['apiKey', 'webhookSecret'],
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
  {
    kind: 'MCP',
    connectionId: 'connection-mcp',
    revision: 2,
    state: 'CONFIGURED_UNVERIFIED',
    settings: {
      endpoint: 'https://mcp.example.com/rpc',
      toolName: 'lookup_contact',
      protocolVersion: '2025-11-25',
    },
    secretFields: ['token'],
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
  // Read without a revision at all. Nothing may be sent for this one.
  {
    kind: 'MAIL',
    connectionId: 'connection-mail',
    revision: null,
    state: 'CONFIGURED_UNVERIFIED',
    settings: {
      connectedAccountId: '22222222-2222-4222-8222-222222222222',
      mailbox: 'INBOX',
      handle: 'contact@atelier.example',
    },
    secretFields: [],
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
  // A tombstone: nothing configured, but the revision a recreation would need.
  {
    kind: 'INTAKE',
    connectionId: null,
    revision: 7,
    state: 'NOT_CONFIGURED',
    settings: null,
    secretFields: [],
    updatedAt: null,
  },
];

const connectionsMock: MockedResponse = {
  request: { query: HERMES_CONNECTIONS_V4 },
  // Read twice: the query is network-only and a refetch follows every write.
  maxUsageCount: 10,
  result: { data: { hermesConnectionsV4: connectionsPayload } },
};

const nativeAccountsMock: MockedResponse = {
  request: { query: GET_MY_CONNECTED_ACCOUNTS },
  maxUsageCount: 10,
  result: {
    data: {
      myConnectedAccounts: [
        {
          __typename: 'ConnectedAccount',
          id: '22222222-2222-4222-8222-222222222222',
          handle: 'contact@atelier.example',
          provider: 'IMAP_SMTP_CALDAV',
          name: 'Atelier',
          archivedAt: null,
          authFailedAt: null,
        },
      ],
    },
  },
};

const botPoliciesMock: MockedResponse = {
  request: { query: HERMES_WORKSPACE_BOT_POLICIES },
  maxUsageCount: 10,
  result: {
    data: {
      hermesWorkspaceBotPolicies: [
        { __typename: 'HermesBotPolicy', scope: 'WORKSPACE', mode: 'ASSISTED', revision: '3' },
        { __typename: 'HermesBotPolicy', scope: 'WHATSAPP', mode: 'INHERIT', revision: '1' },
        { __typename: 'HermesBotPolicy', scope: 'EMAIL', mode: 'OFF', revision: '1' },
      ],
    },
  },
};

const renderSettings = (extraMocks: MockedResponse[] = []) => {
  const store = createStore();

  store.set(currentWorkspaceState.atom, {
    id: COMPANY_ID,
    displayName: 'Atelier Dupont',
  } as never);
  store.set(availableWorkspacesState.atom, {
    availableWorkspacesForSignIn: [],
    availableWorkspacesForSignUp: [],
  } as never);
  store.set(isSameOriginMultiWorkspaceEnabledState.atom, true);

  return render(
    <Provider store={store}>
      <MockedProvider
        mocks={[
          connectionsMock,
          nativeAccountsMock,
          botPoliciesMock,
          ...extraMocks,
        ]}
      >
        <I18nProvider i18n={i18n}>
          <HermesAdminRuntimeSettings />
        </I18nProvider>
      </MockedProvider>
    </Provider>,
  );
};

describe('HermesAdminRuntimeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the connections the server reported, without claiming any is connected', async () => {
    renderSettings();

    // The read landed and the centre is showing it. The configured kinds are
    // named, each from its own published view.
    expect(
      await screen.findByText('WhatsApp (Evolution)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ces connexions appartiennent à Atelier Dupont/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('MCP').length).toBeGreaterThan(0);
    expect(screen.getByText('E-mail entrant (IMAP)')).toBeInTheDocument();

    // CONFIGURED_UNVERIFIED is not connected, and the screen says exactly
    // that: this contract publishes no verification, so nothing carries a
    // verified date.
    expect(
      screen.getAllByText(
        /« Configuré » n’est pas « connecté » : seule une vérification datée l’est/,
      ).length,
    ).toBeGreaterThan(0);

    // A kind the server reported as NOT_CONFIGURED is shown as the centre's
    // own empty slot, never as a record nobody sent.
    expect(
      screen.getAllByText(/Aucune connexion n’est enregistrée pour ce canal/)
        .length,
    ).toBeGreaterThan(0);

    // No secret, mask or suffix reaches the screen from a read.
    expect(screen.queryByText(/apiKey|webhookSecret/)).not.toBeInTheDocument();
  });

  it('sends nothing when a connection was read without its revision', async () => {
    const saveMock = jest.fn();
    const removeMock = jest.fn();

    renderSettings([
      {
        request: { query: HERMES_SAVE_CONNECTION_V4, variables: {} },
        maxUsageCount: 10,
        result: () => {
          saveMock();

          return { data: { hermesSaveConnectionV4: {} } };
        },
        variableMatcher: () => true,
      } as MockedResponse,
      {
        request: { query: HERMES_REMOVE_CONNECTION_V4, variables: {} },
        maxUsageCount: 10,
        result: () => {
          removeMock();

          return { data: { hermesRemoveConnectionV4: {} } };
        },
        variableMatcher: () => true,
      } as MockedResponse,
    ]);

    await screen.findByText('E-mail entrant (IMAP)');

    // The mail connection is the one the server reported without a revision.
    const mailCard = screen
      .getByText('E-mail entrant (IMAP)')
      .closest('article, section, div');

    expect(mailCard).not.toBeNull();

    const editButtons = screen.getAllByRole('button', {
      name: 'Modifier les paramètres',
    });

    // Open each configured connection's form until the one with no revision
    // is found: it is the only one that refuses to send.
    let foundMissingRevision = false;

    for (const editButton of editButtons) {
      await userEvent.click(editButton);

      const notice = screen.queryByText(
        /cette connexion a été lue sans sa révision/,
      );

      if (notice !== null) {
        foundMissingRevision = true;

        // Nothing can be sent, so the save control is not offered as usable.
        expect(
          screen.getByRole('button', { name: 'Enregistrer les modifications' }),
        ).toBeDisabled();
        expect(
          screen.getByRole('button', { name: 'Supprimer la connexion' }),
        ).toBeDisabled();

        break;
      }

      await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    }

    expect(foundMissingRevision).toBe(true);

    // The decisive assertion: with no revision read, nothing left the
    // browser — neither a save nor a removal.
    await waitFor(() => {
      expect(saveMock).not.toHaveBeenCalled();
    });
    expect(removeMock).not.toHaveBeenCalled();
  });
  it('sends the MCP save with the revision it read, under its exact operation', async () => {
    // The mock matches on the EXACT variables, so the match is itself the
    // assertion: the operation name, the kind, the Int revision that was read
    // and the settings the contract pins. `secrets` is absent entirely,
    // because the secret control was left untouched and supplying the object
    // would replace the whole stored set.
    renderSettings([
      {
        request: {
          query: HERMES_SAVE_CONNECTION_V4,
          variables: {
            input: {
              kind: 'MCP',
              expectedRevision: 2,
              settings: {
                endpoint: 'https://mcp.example.com/rpc',
                toolName: 'lookup_contact',
                protocolVersion: '2025-11-25',
                argumentMap: { text: 'text' },
              },
            },
          },
        },
        result: { data: { hermesSaveConnectionV4: { kind: 'MCP' } } },
      },
    ]);

    await screen.findByText('MCP');

    // Open the MCP connection, which the server reported at revision 2. Only
    // registered connections offer this control, in the published slot order:
    // WhatsApp, incoming mail, then MCP.
    const editButtons = screen.getAllByRole('button', {
      name: 'Modifier les paramètres',
    });

    expect(editButtons).toHaveLength(3);

    await userEvent.click(editButtons[2]);

    // Proof the right form opened, from its own accessible name.
    expect(
      screen.getByRole('form', { name: 'Modifier la connexion MCP' }),
    ).toBeInTheDocument();

    // The non-secret settings opened prefilled from what the server reported.
    // The secret control, by contrast, is empty: no secret is ever read back.
    expect(screen.getByLabelText('Adresse du service')).toHaveValue(
      'https://mcp.example.com/rpc',
    );
    expect(screen.getByLabelText('Nom de la connexion')).toHaveValue(
      'lookup_contact',
    );
    expect(
      screen.getByLabelText('Secret (clé, jeton ou mot de passe)'),
    ).toHaveValue('');

    await userEvent.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );

    // The delegation warning comes BEFORE the write, and the operator has to
    // confirm it.
    expect(
      screen.getByText(/arrêtera les réponses automatiques sur ce canal/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Confirmer et arrêter les réponses automatiques',
      }),
    );

    // The write landed, and nothing presents it as a verification: the
    // connection stays « Configuré, à vérifier ». No resumption of the
    // channel's automatic replies is offered.
    expect(
      await screen.findByText(
        /Enregistré\. Aucune vérification n’a eu lieu/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Rien ne les reprend automatiquement : il faut les réactiver dans les politiques du bot/,
      ),
    ).toBeInTheDocument();
  });
});
