import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useId, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { useHermesMailboxSetup } from '@/hermes-mailbox-setup/hooks/useHermesMailboxSetup';
import { SettingsAccountsConnectionForm } from '@/settings/accounts/components/SettingsAccountsConnectionForm';

const StyledPanel = styled.section`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  margin: 0;
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesMailboxSetupPanelProps = {
  // Whether the company has any selectable native account yet. It changes only
  // the wording: the journey is identical, because the centre must be able to
  // add a second mailbox as well as a first one.
  hasExistingAccounts: boolean;
  // Handed the new account's id once it exists server side and the accounts
  // list has been re-read. The caller binds MAIL to it; this panel never
  // writes a connection itself.
  onConnected?: (connectedAccountId: string) => void;
};

export const HermesMailboxSetupPanel = ({
  hasExistingAccounts,
  onConnected,
}: HermesMailboxSetupPanelProps) => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  // Closing on success keeps the outcome: the operator comes back to the
  // centre with the account already in the select, and reads what was and was
  // not established. Cancelling instead clears the outcome entirely.
  const handleConnected = useCallback(
    (connectedAccountId: string) => {
      setIsOpen(false);
      onConnected?.(connectedAccountId);
    },
    [onConnected],
  );

  const {
    formMethods,
    handleSubmit,
    handleSave,
    canSave,
    isSubmitting,
    loading,
    outcome,
    protocolRequirement,
    canRetryWrite,
    resetSetup,
    retryAccountsRead,
  } = useHermesMailboxSetup({ onConnected: handleConnected });

  const isSaving = outcome.kind === 'saving';

  // Everything neither settled nor in flight may hide an applied write, so the
  // re-read is the one action offered.
  const mustReRead = !canRetryWrite && !isSaving;

  const { control } = formMethods;

  const cancelSetup = () => {
    resetSetup();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <StyledPanel aria-labelledby={titleId}>
        <StyledHeader>
          <StyledTitle id={titleId}>
            {hasExistingAccounts
              ? t`Ajouter une boîte mail`
              : t`Aucune boîte mail n’est encore enregistrée`}
          </StyledTitle>
          <StyledDescription>
            {t`La boîte est enregistrée dans le magasin chiffré natif du produit. Ses identifiants ne sont conservés nulle part ailleurs et ne sont jamais relus par cet écran.`}
          </StyledDescription>
        </StyledHeader>

        {outcome.kind === 'saved-unverified' && (
          <HermesAdminNote role="status">
            {t`Boîte enregistrée, non vérifiée. L’enregistrement est acquis ; sa joignabilité n’est pas établie et aucun échange de courrier n’a été prouvé. Utilisez « Tester la connexion » pour établir la joignabilité.`}
          </HermesAdminNote>
        )}

        {(outcome.kind === 'saved-not-reread' ||
          outcome.kind === 'rereading') && (
          <HermesAdminNote role="status">
            {t`Boîte enregistrée, non vérifiée. La liste des comptes n’a pas pu être relue : elle peut être incomplète à l’écran. Le compte existe côté serveur — ne le recréez pas.`}
          </HermesAdminNote>
        )}

        <StyledActions>
          <Button
            type="button"
            variant="solid"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            {t`Connecter une boîte`}
          </Button>

          {(outcome.kind === 'saved-not-reread' ||
            outcome.kind === 'rereading') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={outcome.kind === 'rereading'}
              disabled={outcome.kind === 'rereading'}
              onClick={() => {
                void retryAccountsRead();
              }}
            >
              {t`Relire la liste des comptes`}
            </Button>
          )}
        </StyledActions>
      </StyledPanel>
    );
  }

  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...formMethods}>
      <StyledPanel aria-labelledby={titleId}>
        <StyledHeader>
          <StyledTitle id={titleId}>{t`Connecter une boîte`}</StyledTitle>
          <StyledDescription>
            {t`Renseignez la réception (IMAP) et l’envoi (SMTP) de la boîte de cette société. L’enregistrement ne vérifie pas que le serveur répond.`}
          </StyledDescription>
        </StyledHeader>

        <SettingsAccountsConnectionForm control={control} isEditing={false} />

        {/* The native field set labels this « Name » and offers a person as its
            placeholder. Here the value becomes a mailbox's label in the
            connections list, so what it is for is said rather than guessed. */}
        <HermesAdminNote role="note">
          {t`Le nom identifie cette boîte dans la liste des connexions : nommez la boîte de la société, pas une personne. L’adresse est celle de la boîte elle-même.`}
        </HermesAdminNote>

        {/* The server's requirement, said before the write and with its
            reason, rather than carried by a disabled button alone. */}
        {protocolRequirement.kind === 'missing' && (
          <HermesAdminRuleNote>
            {t`Cette boîte doit porter la réception (IMAP) et l’envoi (SMTP) : la liaison centrale ne s’enregistre que sur une boîte qui fait les deux, et c’est la réception qui fait créer le canal natif dont l’expéditeur de campagne est résolu. Il manque ${protocolRequirement.missing.join(' et ')} — renseignez l’hôte et le mot de passe de ce protocole.`}
          </HermesAdminRuleNote>
        )}

        {outcome.kind === 'not-sent' && (
          <HermesAdminNote role="alert">
            {t`Rien n’a été envoyé : il manque ${outcome.missing.join(' et ')}. Une boîte enregistrée sans les deux protocoles existerait sans pouvoir porter la liaison centrale, et rien ici ne la supprimerait.`}
          </HermesAdminNote>
        )}

        {outcome.kind === 'refused' && (
          <HermesAdminNote role="alert">
            {outcome.reason !== null
              ? t`Le serveur a refusé l’enregistrement : ${outcome.reason}`
              : t`Le serveur a refusé l’enregistrement de cette boîte. Rien n’a été écrit.`}
          </HermesAdminNote>
        )}

        {outcome.kind === 'unconfirmed' && (
          <HermesAdminNote role="alert">
            {outcome.listReread
              ? t`La réponse du serveur n’a pas pu être lue : l’enregistrement n’est ni confirmé ni infirmé. La liste des comptes a été relue — si la boîte y figure, l’enregistrement a bien eu lieu ; sinon, annulez et reprenez. Pour ne pas créer de doublon, rien n’est renvoyé d’ici.`
              : t`La réponse du serveur n’a pas pu être lue : l’enregistrement n’est ni confirmé ni infirmé. Relisez la liste des comptes avant toute autre tentative, pour ne pas créer de doublon.`}
          </HermesAdminNote>
        )}

        {outcome.kind === 'write-unknown' && (
          <HermesAdminNote role="alert">
            {outcome.listReread
              ? t`La réponse ne nous est pas parvenue : nous ne savons pas si la boîte a été enregistrée. La liste des comptes a été relue — si la boîte y figure, l’enregistrement a bien eu lieu.`
              : t`La réponse ne nous est pas parvenue : nous ne savons pas si la boîte a été enregistrée. Ne la recréez pas — relisez la liste des comptes pour voir si elle y figure.`}
          </HermesAdminNote>
        )}

        <StyledActions>
          {/* Offered only on an outcome PROVEN settled, never on the
              complement of a list of uncertain ones: a write that may have
              created the account must not be sendable again, and the recovery
              is a re-read. */}
          {(canRetryWrite || isSaving) && (
            <Button
              type="button"
              variant="solid"
              size="sm"
              loading={loading || isSaving}
              disabled={!canSave || loading || isSaving}
              onClick={handleSubmit((data) => handleSave(data))}
            >
              {t`Enregistrer la boîte`}
            </Button>
          )}

          {mustReRead && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={outcome.kind === 'rereading'}
              disabled={outcome.kind === 'rereading'}
              onClick={() => {
                void retryAccountsRead();
              }}
            >
              {t`Relire la liste des comptes`}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting || loading}
            onClick={cancelSetup}
          >
            {t`Annuler`}
          </Button>
        </StyledActions>
      </StyledPanel>
    </FormProvider>
  );
};
