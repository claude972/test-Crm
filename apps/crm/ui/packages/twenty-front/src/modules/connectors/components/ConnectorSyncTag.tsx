import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconCheck,
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

import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';

type ConnectorSyncPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// A provider confirmation and a record still waiting for one must never read
// the same. Pending is the only dashed outline, so that difference survives a
// colour-blind reading instead of resting on hue alone.
const CONNECTOR_SYNC_PRESENTATION: Record<
  ConnectorSyncStatus,
  ConnectorSyncPresentation
> = {
  'not-configured': {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'solid',
    Icon: IconPlug,
  },
  pending: {
    color: 'amber',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconClock,
  },
  confirmed: {
    color: 'jade',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCheck,
  },
  failed: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconAlertTriangle,
  },
  unavailable: {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
};

type ConnectorSyncTagProps = {
  status: ConnectorSyncStatus;
  // A displayable reason from the provider. Provider text is untrusted, so it
  // is rendered as a label and never as markup or an instruction.
  message?: string;
};

export const ConnectorSyncTag = ({
  status,
  message,
}: ConnectorSyncTagProps) => {
  const { t } = useLingui();

  const labels: Record<ConnectorSyncStatus, string> = {
    'not-configured': t`Not configured`,
    pending: t`Waiting for confirmation`,
    confirmed: t`Confirmed`,
    failed: t`Failed`,
    unavailable: t`Provider unavailable`,
  };

  const { color, variant, borderStyle, Icon } =
    CONNECTOR_SYNC_PRESENTATION[status];

  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
    >
      {message ?? labels[status]}
    </Tag>
  );
};
