import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Tag, type TagColor, type TagProps } from 'kovaa-lab-ui/primitives/data-display';

import { type HermesStructureMetric } from '@/structures/types/HermesStructureMetric';
import { type HermesStructureMetricStatus } from '@/structures/types/HermesStructureMetricStatus';

type StructureMetricValuePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
};

// PARTIAL is the only dashed outline, for the same reason pending is in the
// connector vocabulary: a figure that is knowingly incomplete must not read
// like a settled one, and a shape says so without relying on hue.
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
  metric: HermesStructureMetric;
};

export const StructureMetricValue = ({ metric }: StructureMetricValueProps) => {
  const { t, i18n } = useLingui();

  const { color, variant, borderStyle } =
    METRIC_STATUS_PRESENTATION[metric.status];

  // A forbidden or unavailable metric carries null and must never be shown as
  // zero, while an available zero is a real count. Rendering them differently
  // is the whole point of this component.
  const label = !isDefined(metric.value)
    ? metric.status === 'FORBIDDEN'
      ? t`Not visible to you`
      : t`Not measurable`
    : i18n.number(metric.value);

  return (
    <Tag color={color} variant={variant} borderStyle={borderStyle}>
      {label}
    </Tag>
  );
};
