import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesStructureMetric } from '@/structures/types/HermesStructureMetric';
import { type HermesStructureMetricStatus } from '@/structures/types/HermesStructureMetricStatus';
import { type HermesStructureMetricTotal } from '@/structures/types/HermesStructureMetric';

type StructureMetricValuePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
};

const METRIC_STATUS_PRESENTATION: Record<
  HermesStructureMetricStatus,
  StructureMetricValuePresentation
> = {
  AVAILABLE: { color: 'gray', variant: 'ghost', borderStyle: 'solid' },
  PARTIAL: { color: 'amber', variant: 'outline', borderStyle: 'dashed' },
  FORBIDDEN: { color: 'gray', variant: 'soft', borderStyle: 'solid' },
  UNAVAILABLE: { color: 'gray', variant: 'soft', borderStyle: 'solid' },
};

type StructureMetricValueProps = {
  metric: HermesStructureMetric | HermesStructureMetricTotal;
};

const hasDenominator = (
  metric: HermesStructureMetric | HermesStructureMetricTotal,
): metric is HermesStructureMetricTotal => 'totalStructures' in metric;

export const StructureMetricValue = ({ metric }: StructureMetricValueProps) => {
  const { t, i18n } = useLingui();

  const { color, variant, borderStyle } =
    METRIC_STATUS_PRESENTATION[metric.status];

  // A forbidden or unavailable metric carries null and must never render as
  // zero, while an available zero is a real count.
  const label = !isDefined(metric.value)
    ? metric.status === 'FORBIDDEN'
      ? t`Not visible to you`
      : t`Not measurable`
    : i18n.number(metric.value);

  // A partial figure says so in words and carries how many structures it
  // covers. Colour and a dashed border alone would leave the incompleteness
  // invisible to a screen reader and to anyone who cannot distinguish the hue.
  const partialSuffix =
    metric.status === 'PARTIAL'
      ? hasDenominator(metric)
        ? t`partial, ${metric.contributingStructures} of ${metric.totalStructures} structures`
        : t`partial`
      : undefined;

  return (
    <Tag color={color} variant={variant} borderStyle={borderStyle}>
      {isDefined(partialSuffix) ? `${label} — ${partialSuffix}` : label}
    </Tag>
  );
};
