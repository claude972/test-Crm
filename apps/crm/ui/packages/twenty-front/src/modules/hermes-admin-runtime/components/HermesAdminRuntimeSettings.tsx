import { useLingui } from '@lingui/react/macro';
import { useCallback, useMemo, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesAdminSettingsCenter } from '@/hermes-admin-ui/components/HermesAdminSettingsCenter';
import { type HermesCompanyDraft } from '@/hermes-admin-ui/components/HermesCompanyAddForm';
import {
  HERMES_ADMIN_CONTEXT_CURRENT,
  type HermesAdminContextValidity,
} from '@/hermes-admin-ui/types/HermesAdminContext';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import { type HermesCheckTarget } from '@/hermes-admin-ui/types/HermesConnectionCheck';
import {
  HERMES_CONNECTION_FORM_EMPTY_VALUES,
  type HermesConnectionFormSubject,
  type HermesConnectionFormSubmission,
  type HermesConnectionFormValues,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import { HermesBotPolicySection } from '@/hermes-bot-settings/components/HermesBotPolicySection';
import { HermesMcpToolSurfacePanel } from '@/hermes-admin-runtime/components/HermesMcpToolSurfacePanel';
import { HermesMailboxSetupPanel } from '@/hermes-mailbox-setup/components/HermesMailboxSetupPanel';
import { useHermesConnectionCheck } from '@/hermes-admin-runtime/hooks/useHermesConnectionCheck';
import { useHermesRuntimeCompanies } from '@/hermes-admin-runtime/hooks/useHermesRuntimeCompanies';
import { useHermesRuntimeConnections } from '@/hermes-admin-runtime/hooks/useHermesRuntimeConnections';
import { useHermesRuntimeNativeAccounts } from '@/hermes-admin-runtime/hooks/useHermesRuntimeNativeAccounts';
import {
  HERMES_RUNTIME_KIND_BY_UI_KIND,
  readHermesRuntimeWriteSupport,
} from '@/hermes-admin-runtime/types/HermesRuntimeConnectionKind';

// The settings centre, wired to the central connections store, the bot policy
// operations and the authentication hook's two company methods.
//
// This component owns the reads, the writes and the outcomes. The library it
// renders owns the presentation and decides nothing: every state below was
// read from a server or is the honest absence of one.
export const HermesAdminRuntimeSettings = () => {
  const { t } = useLingui();

  const companies = useHermesRuntimeCompanies();
  const connections = useHermesRuntimeConnections(companies.activeCompanyId);
  const { nativeAccounts, isLoading: nativeAccountsLoading } =
    useHermesRuntimeNativeAccounts();
  // The read-only connection probes. A save still proves nothing: these are
  // the only operations that reach a provider, and the strongest thing they
  // establish is reachability at a dated instant.
  const checks = useHermesConnectionCheck();

  const [formSubject, setFormSubject] =
    useState<HermesConnectionFormSubject | null>(null);

  // Which configuration the held probe results describe. Cleared on every
  // write, so no result is shown against something it was not computed for.
  const [checkedTarget, setCheckedTarget] = useState<HermesCheckTarget | null>(
    null,
  );

  // The account this centre just created, so the operator is told which one to
  // pick. It is an identifier, never a claim: the binding is the save below.
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);

  // What the screen holds, and whether it still belongs to the active company.
  //
  // A session replaced by the server is an answer, so it becomes a stale
  // context and the library turns that into a reload request. Nothing is
  // retried from here, and the state is never cleared on its own: it takes a
  // reload the operator asks for.
  const contextValidity = useMemo<HermesAdminContextValidity>(() => {
    if (companies.isSessionReplaced || connections.isSessionReplaced) {
      return {
        kind: 'stale',
        reason: 'session-replaced',
        message: null,
      };
    }

    return HERMES_ADMIN_CONTEXT_CURRENT;
  }, [companies.isSessionReplaced, connections.isSessionReplaced]);

  // The non-secret values a form opens on, read from what the server reported
  // for that kind.
  //
  // No secret is ever among them. The server never returns one, so there is
  // nothing to prefill and nothing that could be echoed back: the secret
  // control opens empty every time, and leaving it empty keeps the stored
  // secret untouched. Nothing is written to browser storage on the way,
  // not even for the length of an edit.
  const initialValues = useMemo<
    HermesConnectionFormValues | undefined
  >(() => {
    if (formSubject === null || formSubject.mode !== 'edit') {
      return undefined;
    }

    const runtimeKind =
      formSubject.kind === null
        ? undefined
        : HERMES_RUNTIME_KIND_BY_UI_KIND[formSubject.kind];

    if (runtimeKind === undefined) {
      return undefined;
    }

    const settings =
      connections.views.find((view) => view.runtimeKind === runtimeKind)
        ?.settings ?? null;

    const readSetting = (key: string): string => {
      const value = settings?.[key];

      return typeof value === 'string' ? value : '';
    };

    if (runtimeKind === 'MAIL') {
      // The bound native account, and the IMAP FOLDER the server polls —
      // typically INBOX. The folder is not an address and is not presented as
      // one; the attached address belongs to the chosen account and is the
      // server's, never an input.
      return {
        ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
        nativeAccountId: readSetting('connectedAccountId'),
        imapFolder: readSetting('mailbox'),
      };
    }

    if (runtimeKind === 'EVOLUTION') {
      return {
        ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
        label: readSetting('instanceName'),
        endpoint: readSetting('baseUrl'),
      };
    }

    if (runtimeKind === 'MCP') {
      return {
        ...HERMES_CONNECTION_FORM_EMPTY_VALUES,
        label: readSetting('toolName'),
        endpoint: readSetting('endpoint'),
      };
    }

    return HERMES_CONNECTION_FORM_EMPTY_VALUES;
  }, [connections.views, formSubject]);

  // Runs the read-only probes of whichever channel the operator asked about.
  //
  // The channel is resolved from the connection that was read, never from the
  // button's position: probing the wrong channel would show one provider's
  // reachability against another's configuration.
  const handleRequestTest = useCallback(
    (connectionId: string) => {
      if (connections.read.kind !== 'reported') {
        return;
      }

      const connection = connections.read.connections.find(
        (candidate) => candidate.id === connectionId,
      );

      if (connection === undefined) {
        return;
      }

      // The target carries the company, the connection and the revision the
      // probe is about, so its answer cannot be shown against another.
      const target: HermesCheckTarget = {
        companyId: companies.activeCompanyId,
        connectionId: connection.id,
        revision: connection.revision,
      };

      setCheckedTarget(target);
      checks.requestCheck(connection.kind, target);
    },
    [checks, companies.activeCompanyId, connections.read],
  );

  // Any write makes every held result obsolete: the revision has moved, so a
  // result computed under the previous one describes a configuration that no
  // longer exists.
  const discardChecks = useCallback(() => {
    checks.invalidate();
    setCheckedTarget(null);
  }, [checks]);

  const handleRequestEdit = useCallback(
    (connectionId: string) => {
      if (connections.read.kind !== 'reported') {
        return;
      }

      const connection = connections.read.connections.find(
        (candidate) => candidate.id === connectionId,
      );

      if (connection === undefined) {
        return;
      }

      connections.resetWriteState();
      discardChecks();
      setCreatedAccountId(null);

      // The revision is passed on exactly as it was read, never repaired. A
      // connection read without one opens a form that cannot send, and says
      // so, rather than one that sends a revision made up here.
      setFormSubject({
        mode: 'edit',
        kind: connection.kind,
        unknownKind: connection.unknownKind,
        connectionId: connection.id,
        state: connection.state,
        hasStoredSecret: connection.hasStoredSecret,
        revision: connection.revision,
      });
    },
    [connections, discardChecks],
  );

  const handleRequestCreate = useCallback(
    (connectionKind: HermesConnectionKind) => {
      connections.resetWriteState();
      discardChecks();
      setCreatedAccountId(null);
      setFormSubject({ mode: 'create', kind: connectionKind });
    },
    [connections, discardChecks],
  );

  const handleSubmit = useCallback(
    (submission: HermesConnectionFormSubmission) => {
      if (formSubject === null) {
        return;
      }

      const uiKind = formSubject.kind;
      const support = readHermesRuntimeWriteSupport(uiKind);
      const runtimeKind =
        uiKind === null ? undefined : HERMES_RUNTIME_KIND_BY_UI_KIND[uiKind];

      if (runtimeKind === undefined) {
        connections.reportUnsupported({ kind: 'no-server-kind' });

        return;
      }

      discardChecks();
      connections.save(runtimeKind, support, submission);
    },
    [connections, discardChecks, formSubject],
  );

  const handleRequestDelete = useCallback(
    (_connectionId: string, expectedRevision: string) => {
      if (formSubject === null) {
        return;
      }

      const uiKind = formSubject.kind;
      const support = readHermesRuntimeWriteSupport(uiKind);
      const runtimeKind =
        uiKind === null ? undefined : HERMES_RUNTIME_KIND_BY_UI_KIND[uiKind];

      if (runtimeKind === undefined) {
        connections.reportUnsupported({ kind: 'no-server-kind' });

        return;
      }

      discardChecks();
      connections.remove(runtimeKind, support, expectedRevision);
    },
    [connections, discardChecks, formSubject],
  );

  const handleRequestAdd = useCallback(
    (draft: HermesCompanyDraft) => {
      companies.requestAdd(draft.name);
    },
    [companies],
  );

  const createdAccount = useMemo(
    () =>
      createdAccountId === null
        ? undefined
        : nativeAccounts.find((account) => account.id === createdAccountId),
    [createdAccountId, nativeAccounts],
  );

  // The creation half of the mailbox journey, mounted here because this
  // container is what the panel's `onConnected` contract names: the panel
  // writes the native encrypted store and never a connection, and binding MAIL
  // to the new account is this screen's own save.
  const mailboxSetupSlot = (
    <>
      <HermesMailboxSetupPanel
        // Only an answered read may say « none »: an empty list that is still
        // loading is not an absence.
        hasExistingAccounts={nativeAccountsLoading || nativeAccounts.length > 0}
        onConnected={setCreatedAccountId}
      />

      {createdAccountId !== null && (
        <HermesAdminNote role="status">
          {createdAccount === undefined
            ? t`La boîte a été enregistrée. Elle ne figure pas encore dans la liste ci-dessus : relisez la liste des comptes avant de conclure qu’elle manque, et ne la recréez pas.`
            : isNonEmptyString(createdAccount.address)
              ? t`Boîte enregistrée : ${createdAccount.address}. Choisissez-la ci-dessus puis enregistrez la liaison — rien n’est lié tant que cet enregistrement n’a pas eu lieu.`
              : t`Boîte enregistrée, sans adresse renvoyée par le serveur. Choisissez-la ci-dessus puis enregistrez la liaison — rien n’est lié tant que cet enregistrement n’a pas eu lieu.`}
        </HermesAdminNote>
      )}
    </>
  );

  const handleRequestReload = useCallback(() => {
    // A reload the operator asked for, which is the only answer to a replaced
    // session. Nothing is retried in its place.
    window.location.reload();
  }, []);

  const handleCancelForm = useCallback(() => {
    connections.resetWriteState();
    setCreatedAccountId(null);
    setFormSubject(null);
  }, [connections]);

  return (
    <>
      {/* What this build cannot configure, said before the operator tries.
          These are missing controls on this screen, not server refusals, and
          nothing is sent for them. */}
      {connections.writeBlock.kind === 'unsupported' &&
        // `supported` cannot reach this branch, but the type does not tie the
        // two together, so the narrowing is written out rather than asserted.
        connections.writeBlock.support.kind !== 'supported' && (
        <HermesAdminNote role="alert">
          {connections.writeBlock.support.kind === 'no-server-kind'
            ? t`Rien n’a été envoyé : ce canal n’a pas de configuration centrale propre. L’envoi de courrier s’appuie sur le compte connecté natif choisi pour la réception, et les formulaires comme les rendez-vous sont des sources d’une collecte signée, pas des connexions distinctes.`
            : connections.writeBlock.support.detail === 'evolution-two-secrets'
              ? t`Rien n’a été envoyé : cette connexion attend deux secrets distincts — une clé d’API et un secret de webhook de soixante-quatre caractères hexadécimaux minuscules qui en diffère — et cet écran n’offre qu’un seul champ. En envoyer un seul effacerait l’autre, donc rien ne part. Un second champ de secret est requis dans la bibliothèque.`
              : t`Rien n’a été envoyé : une collecte signée attend ses sources autorisées et sa limite de requêtes par minute, et cet écran n’offre aucun contrôle pour les choisir. Les choisir à votre place serait décider de votre politique de collecte.`}
        </HermesAdminNote>
      )}

      <HermesAdminSettingsCenter
        companiesRead={companies.companiesRead}
        membersRead={companies.membersRead}
        connectionsRead={connections.read}
        switchCapability={companies.switchCapability}
        switchState={companies.switchState}
        addCapability={companies.addCapability}
        addState={companies.addState}
        contextValidity={contextValidity}
        hasWriteInFlight={
          companies.hasWriteInFlight || connections.hasWriteInFlight
        }
        connectionFormSubject={formSubject}
        connectionFormInitialValues={initialValues}
        nativeAccounts={nativeAccounts}
        mailboxSetupSlot={mailboxSetupSlot}
        connectionSaveState={connections.saveState}
        checkByProbe={checks.readOutcomes(checkedTarget)}
        checkedConnectionId={checkedTarget?.connectionId ?? null}
        isChecking={checks.isChecking}
        onRequestSwitchCompany={companies.requestSwitch}
        onRequestAddCompany={handleRequestAdd}
        onRequestTestConnection={handleRequestTest}
        onRequestEditConnection={handleRequestEdit}
        onRequestCreateConnection={handleRequestCreate}
        onRequestDeleteConnection={handleRequestDelete}
        onSubmitConnection={handleSubmit}
        onCancelConnectionForm={handleCancelForm}
        onRequestReload={handleRequestReload}
      />

      {/* The company-wide and per-channel bot policy, through the operations
          that already exist. Saving or removing a connection stops the bot
          delegations of the affected channel — the form says so before the
          write — and nothing here offers to resume them: a fresh explicit
          policy action is required, which is exactly what this section is. */}
      <HermesBotPolicySection />

      {/* Ce que le serveur MCP de la société annonce, à côté de la politique
          qui décide si le bot s'en sert. La découverte n'appelle aucun outil :
          le panneau rapporte une offre, pas un connecteur vérifié. */}
      <HermesMcpToolSurfacePanel />
    </>
  );
};
