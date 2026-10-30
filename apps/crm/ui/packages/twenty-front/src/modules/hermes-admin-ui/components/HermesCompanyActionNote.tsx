import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconCircleOff, IconHelpCircle } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesReloadRequest } from '@/hermes-admin-ui/components/HermesReloadRequest';
import {
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
} from '@/hermes-admin-ui/types/HermesCompany';

type HermesCompanyActionNoteProps = {
  capability: HermesCompanyActionCapability;
  state: HermesCompanyActionState;
  // What the action is, so the sentence names it instead of saying
  // "this action".
  actionLabel: string;
  // Raised when the operator asks for a reload after a « session remplacée ».
  // The parent owns the session and the company header; this component only
  // asks.
  onRequestReload: () => void;
};

// Why a company action cannot be run, and what happened when it was.
// 'not-configured' is the real default: the multi-company capability is off,
// so no control is rendered for it at all and this note carries the reason.
// Nothing here is retried on its own.
export const HermesCompanyActionNote = ({
  capability,
  state,
  actionLabel,
  onRequestReload,
}: HermesCompanyActionNoteProps) => {
  const { t } = useLingui();

  return (
    <>
      {capability.kind === 'not-configured' && (
        <>
          <Tag
            color="gray"
            variant="soft"
            truncate={false}
            startIcon={<IconCircleOff />}
          >
            {t`${actionLabel} : indisponible, non configuré`}
          </Tag>
          <HermesAdminNote>
            {t`Aucune API d’authentification multi-société n’est configurée, donc cette commande ne mène nulle part. Elle reste désactivée jusqu’à ce qu’un serveur la déclare.`}
          </HermesAdminNote>
        </>
      )}

      {capability.kind === 'unknown' && (
        <>
          <Tag
            color="gray"
            variant="outline"
            borderStyle="dashed"
            truncate={false}
            startIcon={<IconHelpCircle />}
          >
            {t`${actionLabel} : état inconnu`}
          </Tag>
          <HermesAdminNote role="alert">
            {t`Le serveur n’a pas dit si cette commande est possible. Un état inconnu n’est pas une autorisation : elle reste désactivée.`}
          </HermesAdminNote>
        </>
      )}

      {capability.kind === 'denied' && (
        <>
          <Tag
            color="gray"
            variant="soft"
            truncate={false}
            startIcon={<IconCircleOff />}
          >
            {t`${actionLabel} : non autorisé`}
          </Tag>
          <HermesAdminNote role="alert">
            {isNonEmptyString(capability.reason)
              ? t`Motif renvoyé par le serveur : ${capability.reason}`
              : t`Le serveur refuse cette commande pour ce compte, sans motif renvoyé.`}
          </HermesAdminNote>
        </>
      )}

      {state.kind === 'requesting' && (
        <HermesAdminNote role="status">
          {t`Demande en cours côté serveur…`}
        </HermesAdminNote>
      )}

      {state.kind === 'done' && (
        <HermesAdminNote role="status">
          {isNonEmptyString(state.companyId)
            ? t`Le serveur a appliqué la demande sur la société ${state.companyId}.`
            : t`Le serveur a appliqué la demande.`}
        </HermesAdminNote>
      )}

      {/* The backend's named refusal. Kept apart from a generic refusal and
          from a technical failure, and answered by a reload the operator
          chooses — never by an automatic retry. */}
      {state.kind === 'session-replaced' && (
        <HermesReloadRequest
          headline={t`Session remplacée : la session et le cookie natif ne désignent plus le même utilisateur, le même espace de travail ou la même appartenance. Cela arrive après une bascule faite dans un autre onglet.`}
          message={state.message}
          onRequestReload={onRequestReload}
        />
      )}

      {state.kind === 'refused' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(state.reason)
            ? t`Rien n’a été fait : ${state.reason}`
            : t`Rien n’a été fait.`}
        </HermesAdminNote>
      )}

      {state.kind === 'unconfirmed' && (
        <HermesAdminNote role="alert">
          {t`La réponse du serveur n’a pas pu être lue : le résultat est inconnu. Rechargez pour voir ce qui a été retenu.`}
        </HermesAdminNote>
      )}
    </>
  );
};
