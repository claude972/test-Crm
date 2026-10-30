import { useLingui } from '@lingui/react/macro';
import { IconHelpCircle } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';

import { type HermesCampaignMetric } from '@/hermes-campaigns-ui/types/HermesCampaignResult';
import { readCampaignMetric } from '@/hermes-campaigns-ui/utils/readCampaignMetric';

type HermesCampaignMetricValueProps = {
  metric: HermesCampaignMetric;
};

// Renders one result figure. The whole component exists for one distinction:
// a known 0 shows the digit 0, an unavailable measure shows the word unknown
// and why. The two never share a rendering.
export const HermesCampaignMetricValue = ({
  metric,
}: HermesCampaignMetricValueProps) => {
  const { t, i18n } = useLingui();

  const reading = readCampaignMetric(metric);

  if (reading.kind === 'known') {
    return (
      // A figure, with no icon and no hedging: the server published it.
      <Tag color="gray" variant="ghost" borderStyle="solid" truncate={false}>
        {i18n.number(reading.value)}
      </Tag>
    );
  }

  // The word, the icon and the dashed border all say the same thing, so the
  // state survives greyscale and survives a screen reader.
  const reasons: Record<typeof reading.reason, string> = {
    'not-published': t`Unknown — the server published no figure.`,
    'tracking-disabled': t`Unknown — open tracking is off, so there is nothing to count.`,
    'provider-event-missing': t`Unknown — waiting for an authenticated provider event.`,
    unreadable: t`Unknown — what was published was not a count.`,
  };

  return (
    <Tag
      color="gray"
      variant="outline"
      borderStyle="dashed"
      startIcon={<IconHelpCircle />}
      truncate={false}
      // The sentence is on the tag itself, so the reason reaches a reader who
      // never hovers.
      aria-label={reasons[reading.reason]}
      title={reasons[reading.reason]}
    >
      {t`Unknown`}
    </Tag>
  );
};
