import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconCircleOff,
  IconClock,
  IconPlug,
  IconPlugConnected,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesEvolutionConnectionStatus } from '@/connectors/types/HermesEvolutionConnectionStatus';

type Presentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// PROVIDER_REPORTED_OPEN keeps a dashed border on purpose. A solid green
// badge would read as "connected, you can send", which is precisely the claim
// this status does not support. Dashed carries the doubt without relying on
// hue, so it survives a colour-blind reading; the label carries whose claim it
// is. CONNECTING is amber and dashed because it is in-flight, so the two
// unproven states differ by colour and by wording rather than by border alone.
const PRESENTATION: Record<HermesEvolutionConnectionStatus, Presentation> = {
  NOT_CONFIGURED: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'solid',
    Icon: IconPlug,
  },
  CONNECTING: {
    color: 'amber',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconClock,
  },
  PROVIDER_REPORTED_OPEN: {
    color: 'blue',
    variant: 'soft',
    borderStyle: 'dashed',
    Icon: IconPlugConnected,
  },
  DISCONNECTED: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconAlertTriangle,
  },
  UNAVAILABLE: {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
};

type HermesEvolutionConnectionTagProps = {
  status: HermesEvolutionConnectionStatus;
};

export const HermesEvolutionConnectionTag = ({
  status,
}: HermesEvolutionConnectionTagProps) => {
  const { t } = useLingui();

  // "Provider reports the line open" names the source of the claim instead of
  // asserting it. No label here says "connected" on its own.
  const labels: Record<HermesEvolutionConnectionStatus, string> = {
    NOT_CONFIGURED: t`Not configured`,
    CONNECTING: t`Connecting`,
    PROVIDER_REPORTED_OPEN: t`Provider reports the line open`,
    DISCONNECTED: t`Disconnected`,
    UNAVAILABLE: t`Provider unavailable`,
  };

  const { color, variant, borderStyle, Icon } = PRESENTATION[status];

  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      weight="medium"
    >
      {labels[status]}
    </Tag>
  );
};
