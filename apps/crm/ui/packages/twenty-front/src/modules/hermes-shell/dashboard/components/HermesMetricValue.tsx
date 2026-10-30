import { useLingui } from '@lingui/react/macro';

import { isDefined } from 'kovaa-lab-shared/utils';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import {
  type HermesMetric,
  type HermesMetricStatus,
} from '@/hermes-shell/dashboard/types/HermesMetric';

type HermesMetricPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
};

// Border style and wording carry the status as much as the hue does, so none of
// these four states depends on colour vision to be told apart.
const METRIC_PRESENTATION: Record<
  HermesMetricStatus,
  HermesMetricPresentation
> = {
  available: { color: 'gray', variant: 'ghost', borderStyle: 'solid' },
  loading: { color: 'gray', variant: 'soft', borderStyle: 'solid' },
  unauthorised: { color: 'gray', variant: 'soft', borderStyle: 'solid' },
  unavailable: { color: 'amber', variant: 'outline', borderStyle: 'dashed' },
  notConfigured: { color: 'gray', variant: 'outline', borderStyle: 'dashed' },
};

type HermesMetricValueProps = {
  metric: HermesMetric;
};

export const HermesMetricValue = ({ metric }: HermesMetricValueProps) => {
  const { t, i18n } = useLingui();

  const { color, variant, borderStyle } = METRIC_PRESENTATION[metric.status];

  const label =
    metric.status === 'available' && isDefined(metric.value)
      ? i18n.number(metric.value)
      : metric.status === 'loading'
        ? t`Loading…`
        : metric.status === 'unauthorised'
          ? t`Not authorised`
          : metric.status === 'notConfigured'
            ? t`To configure`
            : t`Unavailable`;

  // truncate={false}: the word IS the information here, and a clipped
  // "Not autho…" would read as a styling accident rather than a status. Only
  // the dashed states use variant="outline", because Tag paints no border at
  // all under the other variants and the dash would be silently dropped.
  return (
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      truncate={false}
    >
      {label}
    </Tag>
  );
};
