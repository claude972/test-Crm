import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconCheck, IconCircleOff, IconHelpCircle } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import {
  type HermesConnectionCapability,
  type HermesConnectionCapabilityReport,
  type HermesConnectionKind,
} from '@/hermes-admin-ui/types/HermesConnection';
import {
  readHermesUnexpectedCapabilityNames,
  resolveHermesConnectionCapabilities,
  type HermesCapabilityAvailability,
} from '@/hermes-admin-ui/utils/hermesConnectionCapability';
import { type HermesConnectionStateDescriptor } from '@/hermes-admin-ui/utils/hermesConnectionState';

const StyledList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledItem = styled.li`
  display: flex;
`;

type HermesConnectionCapabilityListProps = {
  kind: HermesConnectionKind | null;
  descriptor: HermesConnectionStateDescriptor;
  reports: readonly HermesConnectionCapabilityReport[];
};

// What this connection can and cannot do, named one by one. An unconfirmed
// capability is shown as « non confirmée » and spelled out as unavailable in
// the same tag. Nothing is omitted when missing: an operator who sees no
// mention of voice messages would reasonably assume they work.
export const HermesConnectionCapabilityList = ({
  kind,
  descriptor,
  reports,
}: HermesConnectionCapabilityListProps) => {
  const { t } = useLingui();

  const capabilityLabels: Record<HermesConnectionCapability, string> = {
    RECEIVE: t`Réception`,
    SEND: t`Envoi`,
    RECEIVE_MEDIA: t`Médias entrants`,
    SEND_MEDIA: t`Médias sortants`,
    VOICE: t`Messages vocaux`,
    RICH_EMAIL: t`Pièces jointes et mise en forme`,
    READ_ONLY_TOOLS: t`Outils en lecture seule`,
    SIGNED_PAYLOAD: t`Charge utile signée`,
    BOOKING: t`Prise de rendez-vous`,
  };

  const availabilityLabel = (
    availability: HermesCapabilityAvailability,
    capabilityLabel: string,
  ): string =>
    availability === 'available'
      ? t`${capabilityLabel} : disponible`
      : availability === 'unavailable'
        ? t`${capabilityLabel} : indisponible`
        : t`${capabilityLabel} : non confirmée, donc indisponible`;

  const resolved = resolveHermesConnectionCapabilities(
    kind,
    descriptor,
    reports,
  );

  const unexpected = readHermesUnexpectedCapabilityNames(kind, reports);

  if (kind === null) {
    return (
      <HermesAdminNote role="status">
        {t`Ce type de connexion n’est pas reconnu, donc aucune capacité n’est annoncée pour lui.`}
      </HermesAdminNote>
    );
  }

  return (
    <>
      <StyledList aria-label={t`Capacités de la connexion`}>
        {resolved.map(({ capability, availability }) => (
          <StyledItem key={capability}>
            {availability === 'available' ? (
              <Tag
                color="green"
                variant="soft"
                truncate={false}
                startIcon={<IconCheck />}
              >
                {availabilityLabel(availability, capabilityLabels[capability])}
              </Tag>
            ) : availability === 'unavailable' ? (
              <Tag
                color="gray"
                variant="soft"
                truncate={false}
                startIcon={<IconCircleOff />}
              >
                {availabilityLabel(availability, capabilityLabels[capability])}
              </Tag>
            ) : (
              <Tag
                color="gray"
                variant="outline"
                borderStyle="dashed"
                truncate={false}
                startIcon={<IconHelpCircle />}
              >
                {availabilityLabel(availability, capabilityLabels[capability])}
              </Tag>
            )}
          </StyledItem>
        ))}
      </StyledList>

      {unexpected.length > 0 && (
        <HermesAdminNote role="status">
          {t`Capacités annoncées que cet écran ne sait pas situer, laissées telles quelles : ${unexpected.join(', ')}`}
        </HermesAdminNote>
      )}
    </>
  );
};
