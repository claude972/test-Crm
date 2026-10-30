import { useLingui } from '@lingui/react/macro';
import {
  IconCheck,
  IconCircleOff,
  IconHelpCircle,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type ProspectionOppositionState } from '@/prospection/types/ProspectionOppositionState';

type ProspectionOppositionPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// Each state carries its own icon and its own label, so the three never read
// alike without colour. Unknown also takes the dashed outline — the only
// variant where a dashed border actually paints — because it is not a quiet
// yes.
const PROSPECTION_OPPOSITION_PRESENTATION: Record<
  ProspectionOppositionState,
  ProspectionOppositionPresentation
> = {
  'opted-out': {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
  reachable: {
    color: 'jade',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCheck,
  },
  unknown: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconHelpCircle,
  },
};

type ProspectionOppositionTagProps = {
  state: ProspectionOppositionState;
};

// Read-only. There is deliberately no control here to clear an opt-out: the
// front does not write the opt-out register.
export const ProspectionOppositionTag = ({
  state,
}: ProspectionOppositionTagProps) => {
  const { t } = useLingui();

  const labels: Record<ProspectionOppositionState, string> = {
    'opted-out': t`Opted out`,
    reachable: t`No opt-out`,
    unknown: t`Unknown`,
  };

  const { color, variant, borderStyle, Icon } =
    PROSPECTION_OPPOSITION_PRESENTATION[state];

  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      truncate={false}
    >
      {labels[state]}
    </Tag>
  );
};
