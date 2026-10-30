import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import { type ProspectionCountStatus } from '@/prospection/types/ProspectionCountStatus';

type ProspectionCountPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
};

// A dashed border only paints under variant="outline", so the two incomplete
// statuses use that variant. The label carries the distinction in any case:
// every status below reads differently in words, never by hue alone.
const PROSPECTION_COUNT_PRESENTATION: Record<
  ProspectionCountStatus,
  ProspectionCountPresentation
> = {
  exact: { color: 'gray', variant: 'ghost', borderStyle: 'solid' },
  partial: { color: 'amber', variant: 'outline', borderStyle: 'dashed' },
  loading: { color: 'gray', variant: 'outline', borderStyle: 'dashed' },
  unavailable: { color: 'gray', variant: 'outline', borderStyle: 'solid' },
};

type ProspectionCountValueProps = {
  count: ProspectionCount;
};

export const ProspectionCountValue = ({
  count,
}: ProspectionCountValueProps) => {
  const { t, i18n } = useLingui();

  const { color, variant, borderStyle } =
    PROSPECTION_COUNT_PRESENTATION[count.status];

  // A null figure is not a zero, and a figure still being read is not an
  // unavailable one.
  const label = isDefined(count.value)
    ? i18n.number(count.value)
    : count.status === 'loading'
      ? t`Loading…`
      : t`Unavailable`;

  // Said in words with its denominator, so the incompleteness reaches a
  // screen reader too.
  const partialSuffix =
    count.status === 'partial'
      ? isDefined(count.covered) && isDefined(count.total)
        ? t`${count.covered}/${count.total} checked`
        : t`partial`
      : undefined;

  return (
    // truncate={false}: the denominator sits at the end of the label and a
    // cut figure would read as a complete one.
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      truncate={false}
    >
      {isDefined(partialSuffix) ? `${label} — ${partialSuffix}` : label}
    </Tag>
  );
};
