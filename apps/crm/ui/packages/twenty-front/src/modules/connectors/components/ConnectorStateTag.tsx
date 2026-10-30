import { useLingui } from '@lingui/react/macro';
import {
  IconEyeOff,
  IconHelpCircle,
  IconLoader,
  IconPlug,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { HermesEvolutionConnectionTag } from '@/connectors/components/HermesEvolutionConnectionTag';
import { type ConnectorReadState } from '@/connectors/types/ConnectorReadState';

type ConnectorStateKind = Exclude<ConnectorReadState['kind'], 'reported'>;

type ConnectorStatePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// Everything here is an absence of knowledge, so everything is gray and
// dashed except 'absent', which is a fact the server did state. None of them
// may borrow the vocabulary of a fault: a failed read is not a breakdown.
export const CONNECTOR_STATE_TAG_PRESENTATION: Record<
  ConnectorStateKind,
  ConnectorStatePresentation
> = {
  loading: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconLoader,
  },
  unknown: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconHelpCircle,
  },
  absent: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'solid',
    Icon: IconPlug,
  },
  'not-reported': {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconEyeOff,
  },
};

type ConnectorStateTagProps = {
  state: ConnectorReadState;
};

// One badge for every connector, whatever the client happens to know. A
// reported status is delegated so the five published values keep their own
// wording in a single place.
export const ConnectorStateTag = ({ state }: ConnectorStateTagProps) => {
  const { t } = useLingui();

  if (state.kind === 'reported') {
    return <HermesEvolutionConnectionTag status={state.connection.status} />;
  }

  const labels: Record<ConnectorStateKind, string> = {
    loading: t`Checking…`,
    unknown: t`Status unavailable`,
    absent: t`To configure`,
    'not-reported': t`Status not reported`,
  };

  const { color, variant, borderStyle, Icon } =
    CONNECTOR_STATE_TAG_PRESENTATION[state.kind];

  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      weight="medium"
      truncate={false}
    >
      {labels[state.kind]}
    </Tag>
  );
};
