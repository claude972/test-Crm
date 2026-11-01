import { HermesBotMcpAccess } from '@/hermes-admin-ui/components/HermesBotMcpAccess';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useCallback } from 'react';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { HermesConnectionStateTag } from '@/hermes-admin-ui/components/HermesConnectionStateTag';
import {
  isHermesConnectionEditable,
  readHermesConnectionStateDescriptor,
} from '@/hermes-admin-ui/utils/hermesConnectionState';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { type HermesCompanyDraft } from '@/hermes-admin-ui/components/HermesCompanyAddForm';
import { HermesCompanySection } from '@/hermes-admin-ui/components/HermesCompanySection';
import { HermesConnectionCenter } from '@/hermes-admin-ui/components/HermesConnectionCenter';
import { HermesConnectionForm } from '@/hermes-admin-ui/components/HermesConnectionForm';
import { HermesReloadRequest } from '@/hermes-admin-ui/components/HermesReloadRequest';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import {
  type HermesConnectionKind,
  type HermesConnectionsRead,
} from '@/hermes-admin-ui/types/HermesConnection';
import {
  type HermesCompaniesRead,
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
  type HermesCompanyMembersRead,
} from '@/hermes-admin-ui/types/HermesCompany';
import {
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';
import {
  type HermesConnectionFormSubject,
  type HermesConnectionFormSubmission,
  type HermesConnectionFormValues,
  type HermesConnectionSaveState,
  type HermesNativeConnectedAccount,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import { shouldDiscardHermesResult } from '@/hermes-admin-ui/utils/hermesAdminWrite';
import { readHermesActiveCompany } from '@/hermes-admin-ui/utils/hermesCompanyAction';

const StyledCenter = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  min-width: 0;
`;

type HermesAdminSettingsCenterProps = {
  companiesRead: HermesCompaniesRead;
  membersRead: HermesCompanyMembersRead;
  connectionsRead: HermesConnectionsRead;

  switchCapability: HermesCompanyActionCapability;
  switchState: HermesCompanyActionState;
  addCapability: HermesCompanyActionCapability;
  addState: HermesCompanyActionState;

  // Says whether what is held still belongs to the active company. The parent
  // owns the session and the company header; this screen only obeys it.
  contextValidity: HermesAdminContextValidity;
  // True while any write is still in flight, so the switch is withheld rather
  // than offered with a promise of cancellation.
  hasWriteInFlight: boolean;

  // The form is open when the parent says which connection, or which kind, is
  // being edited. This component never opens it on its own.
  connectionFormSubject: HermesConnectionFormSubject | null;
  connectionFormInitialValues?: HermesConnectionFormValues;
  // The existing native connected IMAP and SMTP accounts an e-mail link picks
  // from. Nothing is typed in their place.
  nativeAccounts?: readonly HermesNativeConnectedAccount[];
  // Passed straight through to the connection form, which owns the hole. Its
  // contents belong to the lot that owns the native mailbox setup panel.
  mailboxSetupSlot?: ReactNode;
  whatsappSetupSlot?: ReactNode;
  botSettingsSlot?: ReactNode;
  mcpToolsSlot?: ReactNode;
  connectionSaveState: HermesConnectionSaveState;
  // The last outcome of each read-only probe, shared by the cards and the open
  // form. Keyed by probe because a probe is a channel's own operation.
  checkByProbe: Readonly<
    Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>
  >;
  checkedConnectionId: string | null;
  isChecking: boolean;

  onRequestSwitchCompany: (companyId: string) => void;
  onRequestAddCompany: (draft: HermesCompanyDraft) => void;
  onRequestTestConnection: (connectionId: string) => void;
  onRequestEditConnection: (connectionId: string) => void;
  onRequestCreateConnection: (connectionKind: HermesConnectionKind) => void;
  onRequestDeleteConnection: (
    connectionId: string,
    expectedRevision: string,
  ) => void;
  onSubmitConnection: (submission: HermesConnectionFormSubmission) => void;
  onCancelConnectionForm: () => void;
  onRequestReload: () => void;
};

// The settings centre: operating companies and connections in one place.
//
// Entirely driven by its props. It performs no read, holds no cache and infers
// no outcome: every state it shows was handed to it, and every button raises
// an intention for the parent to act on.
export const HermesAdminSettingsCenter = ({
  companiesRead,
  membersRead,
  connectionsRead,
  switchCapability,
  switchState,
  addCapability,
  addState,
  contextValidity,
  hasWriteInFlight,
  connectionFormSubject,
  connectionFormInitialValues,
  nativeAccounts,
  mailboxSetupSlot,
  whatsappSetupSlot,
  botSettingsSlot,
  mcpToolsSlot,
  connectionSaveState,
  checkByProbe,
  checkedConnectionId,
  isChecking,
  onRequestSwitchCompany,
  onRequestAddCompany,
  onRequestTestConnection,
  onRequestEditConnection,
  onRequestCreateConnection,
  onRequestDeleteConnection,
  onSubmitConnection,
  onCancelConnectionForm,
  onRequestReload,
}: HermesAdminSettingsCenterProps) => {
  const { t } = useLingui();
  const focusConnectionForm = useCallback(
    (node: HTMLDivElement | null) => node?.focus(),
    [],
  );

  const activeCompany = readHermesActiveCompany(companiesRead);
  const mcpConnection =
    connectionsRead.kind === 'reported'
      ? connectionsRead.connections.find(
          (connection) =>
            connection.kind === 'MCP' &&
            connection.companyId === activeCompany?.id,
        )
      : undefined;

  // What is held belongs to the previous company, so it is dropped rather than
  // shown under the new one's name. Nothing is retried on its own.
  if (shouldDiscardHermesResult(contextValidity)) {
    return (
      <StyledCenter>
        <HermesReloadRequest
          headline={
            contextValidity.kind === 'stale' &&
            contextValidity.reason === 'session-replaced'
              ? t`Session remplacée : la session et le cookie natif ne désignent plus le même utilisateur, le même espace de travail ou la même appartenance. Les réglages affichés appartenaient à l’état précédent et ont été abandonnés.`
              : t`La société active a changé. Les réglages affichés appartenaient à la société précédente et ont été abandonnés plutôt que présentés comme courants.`
          }
          message={
            contextValidity.kind === 'stale' ? contextValidity.message : null
          }
          onRequestReload={onRequestReload}
        />
      </StyledCenter>
    );
  }

  return (
    <StyledCenter>
      <header>
        <p>
          <strong>
            Société active : {activeCompany?.name ?? 'à vérifier'}
          </strong>
        </p>
        <p>
          WhatsApp sert aux conversations WhatsApp ; Boîte aux lettres sert aux
          courriels. Ici, vous connectez ces canaux et réglez les réponses du
          bot pour cette société.
        </p>
        <nav
          aria-label="Accès rapides aux connexions"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}
        >
          <a href="#hermes-whatsapp">WhatsApp</a>
          <a href="#hermes-mail">Mail</a>
          <a href="#hermes-bot">Réponses du bot</a>
          <a href="#hermes-mcp">Serveur MCP</a>
        </nav>
      </header>

      {whatsappSetupSlot}

      <section id="hermes-bot" aria-label="Réponses du bot" tabIndex={-1}>
        {botSettingsSlot}
      </section>

      <section id="hermes-mcp" aria-labelledby="hermes-mcp-title" tabIndex={-1}>
        <h2 id="hermes-mcp-title">Connexion MCP du bot</h2>
        <HermesBotMcpAccess />
        <details>
          <summary>Service de réponses externe (optionnel)</summary>
          <p>
            Connectez le serveur Hermès utilisé par le bot. Sa connexion ne
            réactive pas les réponses automatiques.
          </p>
          {connectionsRead.kind === 'reported' && activeCompany ? (
            <>
              <HermesConnectionStateTag
                descriptor={
                  mcpConnection
                    ? readHermesConnectionStateDescriptor(mcpConnection)
                    : { kind: 'NOT_CONFIGURED' }
                }
              />
              <Button
                variant="outline"
                disabled={
                  hasWriteInFlight ||
                  (mcpConnection
                    ? !isHermesConnectionEditable(
                        readHermesConnectionStateDescriptor(mcpConnection),
                      )
                    : false)
                }
                onClick={() =>
                  mcpConnection
                    ? onRequestEditConnection(mcpConnection.id)
                    : onRequestCreateConnection('MCP')
                }
              >
                {mcpConnection
                  ? 'Modifier le serveur MCP'
                  : 'Configurer le serveur MCP'}
              </Button>
            </>
          ) : (
            <p role="status">
              L’état du serveur MCP n’a pas encore été établi. Aucun réglage
              n’est supposé.
            </p>
          )}
        </details>
      </section>

      {connectionFormSubject !== null && (
        <div
          key={`${connectionFormSubject.mode}:${connectionFormSubject.kind}:${connectionFormSubject.mode === 'edit' ? connectionFormSubject.connectionId : 'new'}`}
          tabIndex={-1}
          ref={focusConnectionForm}
        >
          <HermesConnectionForm
            subject={connectionFormSubject}
            companyName={activeCompany?.name ?? null}
            initialValues={connectionFormInitialValues}
            nativeAccounts={nativeAccounts}
            mailboxSetupSlot={mailboxSetupSlot}
            saveState={connectionSaveState}
            checkByProbe={
              connectionFormSubject.mode === 'edit' &&
              connectionFormSubject.connectionId === checkedConnectionId
                ? checkByProbe
                : {}
            }
            isChecking={isChecking}
            contextValidity={contextValidity}
            onSubmit={onSubmitConnection}
            onRequestDelete={(expectedRevision) => {
              if (connectionFormSubject.mode === 'edit') {
                onRequestDeleteConnection(
                  connectionFormSubject.connectionId,
                  expectedRevision,
                );
              }
            }}
            onRequestTest={() => {
              if (connectionFormSubject.mode === 'edit') {
                onRequestTestConnection(connectionFormSubject.connectionId);
              }
            }}
            onCancel={onCancelConnectionForm}
            onRequestReload={onRequestReload}
          />
        </div>
      )}

      <details>
        <summary>Outils et autorisations MCP</summary>
        {mcpToolsSlot}
      </details>

      <section
        id="hermes-mail"
        aria-label="Connexion de la boîte mail"
        tabIndex={-1}
      >
        <HermesConnectionCenter
          read={connectionsRead}
          activeCompanyId={activeCompany?.id ?? null}
          activeCompanyName={activeCompany?.name ?? null}
          checkByProbe={checkByProbe}
          checkedConnectionId={checkedConnectionId}
          isChecking={isChecking}
          onRequestTest={onRequestTestConnection}
          onRequestEdit={onRequestEditConnection}
          onRequestCreate={onRequestCreateConnection}
        />
      </section>

      <HermesCompanySection
        companiesRead={companiesRead}
        membersRead={membersRead}
        switchCapability={switchCapability}
        switchState={switchState}
        addCapability={addCapability}
        addState={addState}
        contextValidity={contextValidity}
        hasWriteInFlight={hasWriteInFlight}
        onRequestSwitch={onRequestSwitchCompany}
        onRequestAdd={onRequestAddCompany}
        onRequestReload={onRequestReload}
      />
    </StyledCenter>
  );
};
