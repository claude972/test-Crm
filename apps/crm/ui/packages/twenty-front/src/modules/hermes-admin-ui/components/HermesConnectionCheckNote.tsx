import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import {
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';

type HermesConnectionCheckNoteProps = {
  probe: HermesConnectionProbe;
  outcome: HermesConnectionCheckOutcome | undefined;
};

// The result of one read-only probe, said in words that do not overstate it.
//
// The word « connecté » appears nowhere in this component, and neither does
// « vérifié ». A probe establishes that a provider answered at one instant.
// Saying more than that is the false claim this whole screen exists to avoid,
// so the wording names the operation, dates it, and stops.
export const HermesConnectionCheckNote = ({
  probe,
  outcome,
}: HermesConnectionCheckNoteProps) => {
  const { t } = useLingui();

  // What was actually dialled, so the operator is not shown a bare verdict.
  const probeLabels: Record<HermesConnectionProbe, string> = {
    EVOLUTION_INSTANCE_STATE: t`état de l’instance WhatsApp`,
    IMAP_LIST_STATUS: t`réception IMAP (liste des dossiers et compteurs)`,
    SMTP_LOGIN_ONLY: t`envoi SMTP (authentification seule)`,
  };

  // What each probe does NOT do. Stated with the result rather than buried in
  // a help page: the operator reads it at the moment they read the verdict.
  const probeLimits: Record<HermesConnectionProbe, string> = {
    EVOLUTION_INSTANCE_STATE: t`Ce test lit l’état de l’instance. Il n’envoie aucun message WhatsApp.`,
    IMAP_LIST_STATUS: t`Ce test liste les dossiers et lit les compteurs du dossier relevé. Il ne relève, ne marque, ne déplace et ne supprime aucun message : un message non lu reste non lu.`,
    SMTP_LOGIN_ONLY: t`Ce test s’arrête à l’authentification, puis ferme. Aucun destinataire, aucun objet et aucun corps n’est transmis : aucun courrier ne peut partir.`,
  };

  const probeLabel = probeLabels[probe];

  if (outcome === undefined || outcome.kind === 'idle') {
    return (
      <HermesAdminNote role="status">
        {t`${probeLabel} : jamais testé. Aucun test n’a eu lieu, ce qui n’est pas un échec.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'checking') {
    return (
      <HermesAdminNote role="status">
        {t`${probeLabel} : test en cours…`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'reachable') {
    const checkedAt = outcome.checkedAt.toLocaleString();
    const observations = outcome.observations.join(' · ');

    return (
      <>
        {/* « Joignable », dated — and explicitly not « connecté ». The
            provider answered a read-only question; that is all. */}
        <HermesAdminNote role="status">
          {isNonEmptyString(observations)
            ? t`${probeLabel} : joignable le ${checkedAt}. Le serveur a répondu : ${observations}.`
            : t`${probeLabel} : joignable le ${checkedAt}. Le serveur a répondu.`}
        </HermesAdminNote>

        {/* The distinction the whole model is built on, said in the wording. */}
        <HermesAdminNote>
          {t`Joignable n’est pas connecté : cela signifie que le serveur a répondu à cet instant et a accepté ces identifiants. Cela ne prouve pas qu’un message arrivera. Seul un échange réellement enregistré le prouve.`}
        </HermesAdminNote>

        <HermesAdminNote>{probeLimits[probe]}</HermesAdminNote>
      </>
    );
  }

  if (outcome.kind === 'reachable-not-ready') {
    const checkedAt = outcome.checkedAt.toLocaleString();

    return (
      <>
        <HermesAdminNote role="alert">
          {t`${probeLabel} : la passerelle a répondu le ${checkedAt}, mais le canal n’est pas prêt à acheminer (${outcome.reason}).`}
        </HermesAdminNote>

        {/* The actionable part: this is a pairing to finish, not a network
            fault to chase. */}
        <HermesAdminNote>
          {t`Ce n’est pas une panne réseau : le service répond. L’appairage WhatsApp de cette instance n’est pas terminé, et rien ne peut être envoyé avant qu’il le soit.`}
        </HermesAdminNote>
      </>
    );
  }

  if (outcome.kind === 'unreachable') {
    const checkedAt =
      outcome.checkedAt === null ? null : outcome.checkedAt.toLocaleString();

    return (
      <HermesAdminNote role="alert">
        {isNonEmptyString(outcome.errorCode)
          ? checkedAt === null
            ? t`${probeLabel} : injoignable. Motif renvoyé : ${outcome.errorCode}.`
            : t`${probeLabel} : injoignable le ${checkedAt}. Motif renvoyé : ${outcome.errorCode}.`
          : checkedAt === null
            ? t`${probeLabel} : injoignable, sans motif renvoyé.`
            : t`${probeLabel} : injoignable le ${checkedAt}, sans motif renvoyé.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'nothing-configured') {
    return (
      <HermesAdminNote role="status">
        {t`${probeLabel} : rien n’est configuré, donc rien n’a été joint. Aucun service n’est en cause.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'not-offered') {
    return (
      <HermesAdminNote role="status">
        {t`${probeLabel} : aucun test n’est publié pour ce canal dans cette version. Rien n’a été joint, et rien n’est présenté comme vérifié.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'connection-changed') {
    return (
      <HermesAdminNote role="alert">
        {t`${probeLabel} : la configuration a changé pendant le test. La réponse porte sur des identifiants qui ne sont plus les identifiants courants, donc elle n’est comptée ni comme réussie ni comme échouée. Relancez le test.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'refused') {
    return (
      <HermesAdminNote role="alert">
        {isNonEmptyString(outcome.reason)
          ? t`${probeLabel} : test refusé — ${outcome.reason}. Rien n’a été joint.`
          : t`${probeLabel} : test refusé. Rien n’a été joint et rien n’a été vérifié.`}
      </HermesAdminNote>
    );
  }

  if (outcome.kind === 'session-replaced') {
    return (
      <HermesAdminNote role="alert">
        {isNonEmptyString(outcome.message)
          ? t`${probeLabel} : session remplacée — ${outcome.message}. Rechargez avant de tester.`
          : t`${probeLabel} : session remplacée. La session et le cookie natif ne désignent plus le même utilisateur ou le même espace. Rechargez avant de tester.`}
      </HermesAdminNote>
    );
  }

  return (
    <HermesAdminNote role="alert">
      {t`${probeLabel} : la réponse du test n’a pas pu être lue. Le résultat est inconnu — ni réussi, ni échoué, et surtout pas vérifié.`}
    </HermesAdminNote>
  );
};
