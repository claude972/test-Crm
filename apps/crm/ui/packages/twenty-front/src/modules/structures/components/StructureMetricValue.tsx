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

  // Null must never render as zero: an available zero is a real count, a
  // forbidden or unmeasured one is not.
  const label = !isDefined(metric.value)
    ? metric.status === 'FORBIDDEN'
      ? t`Not authorised`
      : t`Unavailable`
    : i18n.number(metric.value);

  // Said in words, not by hue alone, so the incompleteness reaches a screen
  // reader and anyone who cannot tell the colours apart.
  const partialSuffix =
    metric.status === 'PARTIAL'
      ? hasDenominator(metric)
        ? t`partial, ${metric.contributingStructures}/${metric.totalStructures}`
        : t`partial`
      : undefined;

  return (
    <Tag color={color} variant={variant} borderStyle={borderStyle}>
      {isDefined(partialSuffix) ? `${label} — ${partialSuffix}` : label}
    </Tag>
  );
};
