import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { HERMES_MCP_TOOL_SURFACE } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesMcpToolSurface';
import { HermesMcpToolSurfacePanel } from '@/hermes-admin-runtime/components/HermesMcpToolSurfacePanel';

// Les pièges autour desquels le DTO a été façonné, chacun une assertion :
// « prêt » n'est pas une preuve de fonctionnement, un accord orphelin reste
// visible, une liste tronquée est dite incomplète, et l'instant affiché est
// celui de la demande.
const tool = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'HermesMcpDiscoveredToolState',
  name: 'draft_reply',
  title: 'Rédiger une réponse',
  authorized: true,
  callable: true,
  refusals: [],
  isDraftingTool: true,
  ...overrides,
});

const surface = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'HermesMcpToolSurface',
  status: 'READY',
  checkedAt: '2026-10-31T08:00:00.000Z',
  errorCode: null,
  authorizedTools: ['draft_reply'],
  draftingTool: 'draft_reply',
  truncated: false,
  tools: [tool()],
  ...overrides,
});

const surfaceMock = (data: unknown): MockedResponse => ({
  request: { query: HERMES_MCP_TOOL_SURFACE },
  maxUsageCount: 10,
  result: { data: { hermesMcpToolSurface: data } },
});

const renderPanel = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>
        <HermesMcpToolSurfacePanel />
      </I18nProvider>
    </MockedProvider>,
  );

describe('HermesMcpToolSurfacePanel', () => {
  it('lists each discovered tool with its grant and the server verdict', async () => {
    renderPanel([
      surfaceMock(
        surface({
          authorizedTools: ['draft_reply', 'send_mail'],
          tools: [
            tool(),
            tool({
              name: 'send_mail',
              title: null,
              authorized: true,
              callable: false,
              refusals: ['MCP_TOOL_SCOPE_MISSING', 'MCP_TOOL_DISABLED'],
              isDraftingTool: false,
            }),
          ],
        }),
      ),
    ]);

    expect(await screen.findByText('draft_reply')).toBeVisible();
    expect(screen.getByText('send_mail')).toBeVisible();
    expect(screen.getByText('Non appelable')).toBeVisible();
    // Les refus sont montrés dans les termes du serveur.
    expect(
      screen.getByText('MCP_TOOL_SCOPE_MISSING, MCP_TOOL_DISABLED'),
    ).toBeVisible();
  });

  it('never presents READY as proof the drafting tool works', async () => {
    renderPanel([surfaceMock(surface())]);

    expect(
      await screen.findByText(
        /Aucun outil n’est appelé pendant la découverte/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Outil de rédaction annoncé : draft_reply. Annoncé, pas vérifié.',
      ),
    ).toBeVisible();
  });

  it('keeps a granted name the server never advertised visible', async () => {
    renderPanel([
      surfaceMock(
        surface({ authorizedTools: ['draft_reply', 'ghost_tool'] }),
      ),
    ]);

    expect(await screen.findByText('ghost_tool')).toBeVisible();
    expect(
      screen.getByText(/ne correspondent à aucun outil annoncé/),
    ).toBeVisible();
  });

  it('says a truncated list is incomplete', async () => {
    renderPanel([surfaceMock(surface({ truncated: true }))]);

    expect(
      await screen.findByText(/cette liste est incomplète/),
    ).toBeVisible();
  });

  it('refuses to call unknown completeness a complete surface', async () => {
    renderPanel([surfaceMock(surface({ truncated: null }))]);

    expect(
      await screen.findByText(/n’a pas dit si cette liste est complète/),
    ).toBeVisible();
  });

  it('reports when it asked, not that the surface is still current', async () => {
    renderPanel([surfaceMock(surface())]);

    expect(
      await screen.findByText(
        'Demandé le 2026-10-31T08:00:00.000Z. Rien depuis cet instant n’est reflété ici.',
      ),
    ).toBeVisible();
  });

  it('names what to configure when nothing is configured', async () => {
    renderPanel([
      surfaceMock(
        surface({
          status: 'NOT_CONFIGURED',
          errorCode: null,
          authorizedTools: [],
          draftingTool: null,
          tools: [],
        }),
      ),
    ]);

    expect(
      await screen.findByText(/HERMES_MCP_CONNECTIONS/),
    ).toBeVisible();
    // Pas de promesse de fonctionnement sur un état non configuré.
    expect(
      screen.queryByText(/Aucun outil n’est appelé pendant la découverte/),
    ).not.toBeInTheDocument();
  });

  it('shows an unavailable server with its error code, not as a tool problem', async () => {
    renderPanel([
      surfaceMock(
        surface({
          status: 'UNAVAILABLE',
          errorCode: 'HERMES_MCP_DISCOVERY_UNAVAILABLE',
          authorizedTools: [],
          draftingTool: null,
          tools: [],
        }),
      ),
    ]);

    expect(
      await screen.findByText(
        'Le serveur MCP n’a pas répondu (HERMES_MCP_DISCOVERY_UNAVAILABLE). Ce n’est pas un problème d’outil : aucun outil n’a été interrogé.',
      ),
    ).toBeVisible();
  });

  it('shows a configuration error with its code, not as a tool problem', async () => {
    renderPanel([
      surfaceMock(
        surface({
          status: 'CONFIGURATION_ERROR',
          errorCode: 'HERMES_MCP_CONFIGURATION_UNAVAILABLE',
          authorizedTools: [],
          draftingTool: null,
          tools: [],
        }),
      ),
    ]);

    expect(
      await screen.findByText(
        'La configuration MCP n’a pas pu être lue (HERMES_MCP_CONFIGURATION_UNAVAILABLE). Ce n’est pas un problème d’outil.',
      ),
    ).toBeVisible();
  });

  it('shows an unpublished grant or callability as unknown, never as a refusal', async () => {
    renderPanel([
      surfaceMock(
        surface({
          tools: [tool({ authorized: null, callable: null })],
        }),
      ),
    ]);

    expect(await screen.findAllByText('Non publié')).toHaveLength(2);
    expect(screen.queryByText('Non accordé')).not.toBeInTheDocument();
    expect(screen.queryByText('Non appelable')).not.toBeInTheDocument();
  });

  it('says no refusal was published rather than implying the tool is callable', async () => {
    renderPanel([
      surfaceMock(
        surface({ tools: [tool({ callable: false, refusals: [] })] }),
      ),
    ]);

    expect(await screen.findByText('Aucun refus publié')).toBeVisible();
    expect(screen.getByText('Non appelable')).toBeVisible();
  });

  it('shows a denial as a denial, never as an empty surface', async () => {
    renderPanel([
      {
        request: { query: HERMES_MCP_TOOL_SURFACE },
        result: {
          errors: [
            { message: 'Forbidden', extensions: { code: 'FORBIDDEN' } },
          ],
        },
      },
    ]);

    expect(
      await screen.findByText(
        'Votre rôle ne permet pas de lire la surface d’outils MCP.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/sans annoncer d’outil/),
    ).not.toBeInTheDocument();
  });

  it('shows an unreadable payload as unknown, never as no tool', async () => {
    renderPanel([surfaceMock(surface({ status: 'SOMETHING_ELSE' }))]);

    expect(
      await screen.findByText(/La surface d’outils n’a pas pu être lue/),
    ).toBeVisible();
    expect(
      screen.queryByText(/sans annoncer d’outil/),
    ).not.toBeInTheDocument();
  });
});
