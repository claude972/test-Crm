import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconCircleDashed,
  IconCircleOff,
  IconClock,
  IconPlug,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesEvolutionConnectionStatus } from '@/connectors/types/HermesEvolutionConnectionStatus';

type HermesEvolutionConnectionPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// The two unproven states keep a dashed border, and they are the only ones
// that do. Tag only paints a border in the 'outline' variant, so an unproven
// state must be outline or the dashed cue silently disappears and the
// distinction falls back to hue alone.
//
// Nothing here is solid green: no value in this contract proves a connector
// can send.
export const HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION: Record<
  HermesEvolutionConnectionStatus,
  HermesEvolutionConnectionPresentation
> = {
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
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconCircleDashed,
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

  const labels: Record<HermesEvolutionConnectionStatus, string> = {
    NOT_CONFIGURED: t`To configure`,
    CONNECTING: t`Connecting`,
    // The qualifier is the load-bearing half of this label, which is why the
    // tag never truncates: 'Provider: active' on its own would read as ready.
    PROVIDER_REPORTED_OPEN: t`Provider: active · sending not tested`,
    DISCONNECTED: t`Disconnected`,
    UNAVAILABLE: t`Provider unavailable`,
  };

  const { color, variant, borderStyle, Icon } =
    HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION[status];

  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      weight="medium"
      truncate={false}
    >
      {labels[status]}
    </Tag>
  );
};
