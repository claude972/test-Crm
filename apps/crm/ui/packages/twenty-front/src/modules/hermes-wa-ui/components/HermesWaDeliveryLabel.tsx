import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconCheck,
  IconClock,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaCode } from '@/hermes-wa-ui/components/HermesWaNote';
import { type HermesWaDelivery } from '@/hermes-wa-ui/types/HermesWaDelivery';

const StyledGroup = styled.span`
  align-items: center;
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

const StyledText = styled.span`
  overflow-wrap: anywhere;

  &[data-tone='danger'] {
    color: ${themeCssVariables.font.color.danger};
  }
`;

type HermesWaDeliveryLabelProps = {
  delivery: HermesWaDelivery;
};

// The delivery state, in words, inside the bubble. No bare tick anywhere: a
// tick is read as delivered, and the only receipt this product has is
// ACCEPTED, which is a provider acknowledgement. Each reading gets its own
// sentence with an icon beside it, never instead of it.
export const HermesWaDeliveryLabel = ({
  delivery,
}: HermesWaDeliveryLabelProps) => {
  const { t } = useLingui();

  const { state, errorCode } = delivery;

  const presentation =
    state.kind === 'unknown'
      ? {
          label: isNonEmptyString(state.raw) ? state.raw : t`State not reported`,
          icon: <IconHelpCircle />,
          tone: 'muted' as const,
        }
      : state.state === 'RECEIVED'
        ? {
            label: t`Received`,
            icon: <IconArrowDown />,
            tone: 'muted' as const,
          }
        : state.state === 'ACCEPTED'
          ? {
              // Never "delivered", and never a tick on its own.
              label: t`Accepted, delivery unknown`,
              icon: <IconCheck />,
              tone: 'muted' as const,
            }
          : state.state === 'UNCONFIRMED'
            ? {
                label: t`Unconfirmed`,
                icon: <IconClock />,
                tone: 'muted' as const,
              }
            : {
                label: t`Failed`,
                icon: <IconAlertTriangle />,
                tone: 'danger' as const,
              };

  return (
    <StyledGroup>
      {presentation.icon}
      <StyledText data-tone={presentation.tone}>
        {presentation.label}
      </StyledText>

      {/* Verbatim. Its presence is the fact; it is not parsed. */}
      {isNonEmptyString(errorCode) && <HermesWaCode>{errorCode}</HermesWaCode>}
    </StyledGroup>
  );
};
