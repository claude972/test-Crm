import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HermesWhatsappSetupSection } from '@/hermes-whatsapp-setup/components/HermesWhatsappSetupSection';
import {
  HERMES_WHATSAPP_ENROLLMENT_ACTIVATE,
  HERMES_WHATSAPP_ENROLLMENT_QR,
  HERMES_WHATSAPP_ENROLLMENT_STATUS,
} from '@/hermes-whatsapp-setup/graphql/hermesWhatsappEnrollment';

const scope = {
  workspaceId: 'workspace-a',
  sessionIdentity: {},
  expectedRevision: 2,
  companyName: 'Alpha',
  onReload: jest.fn(),
};
const pending = {
  state: 'AWAITING_PAIRING',
  revision: 2,
  providerState: 'connecting',
  ingressEnabled: false,
  cutoffAt: null,
  botMode: 'OFF',
  reasonCode: null,
};
const status = (view: unknown): MockedResponse => ({
  request: {
    query: HERMES_WHATSAPP_ENROLLMENT_STATUS,
    variables: { input: { expectedRevision: 2 } },
  },
  result: { data: { hermesWhatsappEnrollmentStatus: view } },
});

const renderSection = (mocks: MockedResponse[]) => {
  const operations: Operation[] = [];
  const link = ApolloLink.from([
    new ApolloLink((operation, forward) => {
      operations.push(operation);
      return forward(operation);
    }),
    new MockLink(mocks),
  ]);
  render(
    <MockedProvider link={link}>
      <HermesWhatsappSetupSection {...scope} />
    </MockedProvider>,
  );
  return operations;
};

describe('HermesWhatsappSetupSection', () => {
  it('offers QR inside the CRM without asking for provider credentials', async () => {
    renderSection([status(pending)]);
    expect(
      await screen.findByRole('button', {
        name: 'Afficher ou actualiser le QR',
      }),
    ).toBeEnabled();
    expect(screen.getByText(/Appareils connectés/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/API|baseURL|secret/i),
    ).not.toBeInTheDocument();
  });

  it('accepts a private phone number only for the explicit code action, then clears it', async () => {
    const operations = renderSection([
      status(pending),
      {
        request: {
          query: HERMES_WHATSAPP_ENROLLMENT_QR,
          variables: {
            input: { expectedRevision: 2, phoneNumber: '+33612345678' },
          },
        },
        result: {
          data: {
            hermesWhatsappEnrollmentQr: {
              ...pending,
              pairingCode: 'ABCD-EFGH',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            },
          },
        },
      },
    ]);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Utiliser un code' }),
    );
    const input = screen.getByLabelText(
      'Numéro WhatsApp avec indicatif du pays',
    );
    const action = screen.getByRole('button', {
      name: 'Obtenir un code d’association',
    });
    expect(action).toBeDisabled();
    await userEvent.type(input, '+33612345678');
    await userEvent.click(action);
    expect(
      await screen.findByLabelText('Code d’association WhatsApp'),
    ).toHaveTextContent('ABCD-EFGH');
    expect(
      screen.getByLabelText('Numéro WhatsApp avec indicatif du pays'),
    ).toHaveValue('');
    expect(
      operations.filter(
        (operation) => operation.operationName === 'HermesWhatsappEnrollmentQr',
      ),
    ).toHaveLength(1);
  });

  it('does not equate open with reception and activation requires a human action with bot OFF', async () => {
    const operations = renderSection([
      status({
        ...pending,
        state: 'PAIRED_PENDING_ACTIVATION',
        providerState: 'open',
      }),
      {
        request: {
          query: HERMES_WHATSAPP_ENROLLMENT_ACTIVATE,
          variables: { input: { expectedRevision: 2 } },
        },
        result: {
          data: {
            hermesWhatsappEnrollmentActivate: {
              ...pending,
              revision: 3,
              state: 'ACTIVE',
              providerState: 'open',
              ingressEnabled: true,
              cutoffAt: new Date().toISOString(),
            },
          },
        },
      },
    ]);
    expect(
      await screen.findByText('Appareil associé · réception inactive'),
    ).toBeInTheDocument();
    expect(operations.map((operation) => operation.operationName)).toEqual([
      'HermesWhatsappEnrollmentStatus',
    ]);
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Activer la réception des nouveaux messages',
      }),
    );
    await screen.findByText('Appareil associé · réception activée');
    expect(screen.getByText(/Aucun échange de message/)).toBeInTheDocument();
  });

  it('keeps activation closed while the real bot policy is AUTO', async () => {
    const operations = renderSection([
      status({
        ...pending,
        state: 'PAIRED_PENDING_ACTIVATION',
        providerState: 'open',
        botMode: 'AUTO',
      }),
    ]);
    await screen.findByText(/Désactivez les réponses du bot/);
    expect(
      screen.queryByRole('button', {
        name: 'Activer la réception des nouveaux messages',
      }),
    ).not.toBeInTheDocument();
    expect(operations).toHaveLength(1);
  });

  it('names a permission refusal without offering an association', async () => {
    renderSection([
      {
        request: {
          query: HERMES_WHATSAPP_ENROLLMENT_STATUS,
          variables: { input: { expectedRevision: 2 } },
        },
        result: {
          errors: [{ message: 'Denied', extensions: { code: 'FORBIDDEN' } }],
        },
      },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Votre session ou votre rôle/,
    );
    expect(
      screen.queryByRole('button', { name: 'Scanner un QR' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Connecter mon téléphone' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('img')).not.toBeInTheDocument(),
    );
  });
});
