import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconHelpCircle,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesCampaignCountSummary } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';

type Presentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon?: IconComponent;
};

// A dashed border only paints under variant="outline", so the two incomplete
// summaries use it. The word carries the distinction in any case: none of the
// three reads like another without colour.
const PRESENTATION: Record<HermesCampaignCountSummary['kind'], Presentation> = {
  exact: { color: 'gray', variant: 'ghost', borderStyle: 'solid' },
  partial: {
    color: 'amber',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconAlertTriangle,
  },
  unknown: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconHelpCircle,
  },
};

type HermesCampaignCountValueProps = {
  count: HermesCampaignCountSummary;
};

// Renders a figure the way it was obtained. An unknown figure never borrows
// the look of a zero, and a short sum always carries how much it is missing.
export const HermesCampaignCountValue = ({
  count,
}: HermesCampaignCountValueProps) => {
  const { t, i18n } = useLingui();

  const { color, variant, borderStyle, Icon } = PRESENTATION[count.kind];

  const label =
    count.kind === 'unknown'
      ? t`Unknown`
      : count.kind === 'partial'
        ? t`${i18n.number(count.value)} at least — ${i18n.number(count.unreadableEntryCount)} entries unreadable`
        : i18n.number(count.value);

  return (
    // truncate={false}: a cut figure would read as a complete one.
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={Icon === undefined ? undefined : <Icon />}
      truncate={false}
    >
      {label}
    </Tag>
  );
};
