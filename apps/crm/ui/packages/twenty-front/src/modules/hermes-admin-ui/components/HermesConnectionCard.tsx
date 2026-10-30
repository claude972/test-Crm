import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesConnectionCapabilityList } from '@/hermes-admin-ui/components/HermesConnectionCapabilityList';
import { HermesConnectionStateTag } from '@/hermes-admin-ui/components/HermesConnectionStateTag';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import { type HermesConnectionTestState } from '@/hermes-admin-ui/types/HermesConnectionForm';
import {
  isHermesConnectionEditable,
  isHermesConnectionTestable,
  readHermesConnectionStateDescriptor,
} from '@/hermes-admin-ui/utils/hermesConnectionState';
import { type HermesConnectionSlot } from '@/hermes-admin-ui/utils/hermesConnectionSlots';
import { parseHermesInstant } from '@/hermes-admin-ui/utils/parseHermesInstant';

const StyledCard = styled.article`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTitle = styled.h4`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesConnectionCardProps = {
  slot: HermesConnectionSlot;
  // The company this card belongs to, named on the card itself so a setting
  // can be seen to stop at one company.
  companyName: string | null;
  // This connection's test state only. The parent narrows it by connection id
  // so one card's result never shows up on another.
  testState: HermesConnectionTestState;
  // All three callbacks raise an intention. This card decides nothing: it does
  // not know whether a test succeeded until the parent tells it.
  onRequestTest: (connectionId: string) => void;
  onRequestEdit: (connectionId: string) => void;
  onRequestCreate: (connectionKind: HermesConnectionKind) => void;
};

// One channel: either a registered connection with its state and capabilities,
// or a channel with nothing set up.
export const HermesConnectionCard = ({
  slot,
  companyName,
  testState,
  onRequestTest,
  onRequestEdit,
  onRequestCreate,
}: HermesConnectionCardProps) => {
  const { t, i18n } = useLingui();

  const kindLabels: Record<HermesConnectionKind, string> = {
    WHATSAPP_EVOLUTION: t`WhatsApp (Evolution)`,
    EMAIL_IMAP: t`E-mail entrant (IMAP)`,
    EMAIL_SMTP: t`E-mail sortant (SMTP)`,
    MCP: t`MCP`,
    SIGNED_INTAKE: t`Collectes signées`,
    FORMS: t`Formulaires`,
    APPOINTMENTS: t`Rendez-vous`,
  };

  const companyLine = isNonEmptyString(companyName)
    ? t`Société exploitante : ${companyName}`
    : t`Société exploitante non nommée par le serveur`;

  // Nothing registered for this channel. The contract's own reading: no
  // registered connection is « Non configuré », so that is exactly what is
  // shown — with no state, no date and no capability claimed for it.
  if (slot.kind === 'unregistered') {
    const title = kindLabels[slot.connectionKind];

    return (
      <StyledCard aria-label={title}>
        <StyledHeader>
          <StyledTitle>{title}</StyledTitle>

          <HermesConnectionStateTag descriptor={{ kind: 'NOT_CONFIGURED' }} />
        </StyledHeader>

        <StyledMeta>{companyLine}</StyledMeta>

        <HermesAdminNote>
          {t`Aucune connexion n’est enregistrée pour ce canal. Tant qu’il n’y en a pas, aucune capacité n’est annoncée et rien n’est testé.`}
        </HermesAdminNote>

        <StyledActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestCreate(slot.connectionKind)}
          >
            {t`Configurer`}
          </Button>
        </StyledActions>
      </StyledCard>
    );
  }

  const { connection } = slot;

  const descriptor = readHermesConnectionStateDescriptor(connection);

  const title =
    connection.kind !== null
      ? kindLabels[connection.kind]
      : isNonEmptyString(connection.unknownKind)
        ? t`Connexion non reconnue : ${connection.unknownKind}`
        : t`Connexion sans type`;

  const isTesting = testState.kind === 'testing';

  const verifiedAtLabel =
    testState.kind === 'verified'
      ? (() => {
          const instant = parseHermesInstant(testState.verifiedAt);

          return instant.kind === 'at'
            ? i18n.date(instant.date, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : null;
        })()
      : null;

  return (
    <StyledCard aria-label={title}>
      <StyledHeader>
        <StyledTitle>{title}</StyledTitle>

        <HermesConnectionStateTag descriptor={descriptor} />
      </StyledHeader>

      {isNonEmptyString(connection.label) && (
        <StyledMeta>{connection.label}</StyledMeta>
      )}

      {isNonEmptyString(connection.protocol) && (
        <StyledMeta>{connection.protocol}</StyledMeta>
      )}

      {/* The company is named on every card: a connection belongs to one
          operating company, and changing it has no effect on any other. */}
      <StyledMeta>{companyLine}</StyledMeta>

      {descriptor.kind === 'CONFIGURED_UNVERIFIED' && (
        <HermesAdminRuleNote>
          {t`Des paramètres existent et rien ne les a confirmés. « Configuré » n’est pas « connecté » : seule une vérification datée l’est.`}
        </HermesAdminRuleNote>
      )}

      {descriptor.kind === 'DISABLED' && (
        <HermesAdminRuleNote>
          {isNonEmptyString(descriptor.disabledBy)
            ? t`Désactivée par ${descriptor.disabledBy}. C’est une décision d’administrateur sur cette connexion, distincte d’un bot coupé.`
            : t`Désactivée par un administrateur. C’est une décision sur cette connexion, distincte d’un bot coupé.`}
        </HermesAdminRuleNote>
      )}

      {descriptor.kind === 'ERROR' && isNonEmptyString(descriptor.errorCode) && (
        <HermesAdminNote role="status">
          {t`Motif renvoyé par le serveur : ${descriptor.errorCode}`}
        </HermesAdminNote>
      )}

      {descriptor.kind === 'UNKNOWN' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(descriptor.reported)
            ? t`État non reconnu, laissé tel quel : ${descriptor.reported}. Rien n’est modifié depuis cet écran.`
            : t`Le serveur n’a pas donné d’état pour cette connexion. Rien n’est modifié depuis cet écran.`}
        </HermesAdminNote>
      )}

      <HermesConnectionCapabilityList
        kind={connection.kind}
        descriptor={descriptor}
        reports={connection.capabilities}
      />

      <StyledActions>
        <Button
          variant="outline"
          size="sm"
          loading={isTesting}
          disabled={!isHermesConnectionTestable(descriptor)}
          onClick={() => onRequestTest(connection.id)}
        >
          {t`Tester la connexion`}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!isHermesConnectionEditable(descriptor)}
          onClick={() => onRequestEdit(connection.id)}
        >
          {t`Modifier les paramètres`}
        </Button>
      </StyledActions>

      {!isHermesConnectionTestable(descriptor) && (
        <HermesAdminNote>
          {descriptor.kind === 'NOT_CONFIGURED'
            ? t`Rien n’est configuré, il n’y a donc rien à tester.`
            : descriptor.kind === 'DISABLED'
              ? t`Une connexion désactivée n’est pas testée : il faut d’abord revenir sur la décision d’administrateur.`
              : t`L’état n’a pas pu être lu, aucun test n’est proposé sur cette base.`}
        </HermesAdminNote>
      )}

      {/* The outcome is whatever the parent handed over. Nothing here is
          deduced from the button having been pressed. */}
      {isTesting && (
        <HermesAdminNote role="status">
          {t`Test en cours côté serveur…`}
        </HermesAdminNote>
      )}

      {testState.kind === 'verified' && (
        <HermesAdminNote role="status">
          {verifiedAtLabel === null
            ? t`Le serveur a répondu que le test est passé, sans en donner la date. Sans date, cette connexion n’est pas présentée comme vérifiée.`
            : t`Test passé. Vérifiée le ${verifiedAtLabel}.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'failed' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(testState.errorCode)
            ? t`Test échoué : ${testState.errorCode}`
            : t`Test échoué, sans motif renvoyé.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'refused' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(testState.reason)
            ? t`Test refusé : ${testState.reason}`
            : t`Test refusé. Rien n’a été vérifié.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'session-replaced' && (
        <HermesAdminNote role="alert">
          {t`Session remplacée : rien n’a été vérifié. Rechargez les réglages, aucun test n’est relancé automatiquement.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'unconfirmed' && (
        <HermesAdminNote role="alert">
          {t`La réponse du test n’a pas pu être lue : le résultat est inconnu, ni réussi ni échoué. Rechargez pour voir l’état retenu.`}
        </HermesAdminNote>
      )}
    </StyledCard>
  );
};
