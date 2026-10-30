import { type HermesCampaignMetric } from '@/hermes-campaigns-ui/types/HermesCampaignResult';
import { readCampaignMetric } from '@/hermes-campaigns-ui/utils/readCampaignMetric';

const metric = (
  metricPart: Partial<HermesCampaignMetric>,
): HermesCampaignMetric => ({
  evidence: 'SMTP_ACCEPTED',
  value: 0,
  unknownReason: null,
  note: null,
  ...metricPart,
});

describe('readCampaignMetric', () => {
  // The distinction the results section is built around.
  it('reads a published zero as the figure zero', () => {
    expect(readCampaignMetric(metric({ value: 0 }))).toEqual({
      kind: 'known',
      value: 0,
    });
  });

  it('reads a missing figure as unknown, not as zero', () => {
    expect(readCampaignMetric(metric({ value: null }))).toEqual({
      kind: 'unknown',
      reason: 'not-published',
    });
  });

  it('keeps the reason the server gave for a missing figure', () => {
    expect(
      readCampaignMetric(
        metric({
          evidence: 'OPEN_OBSERVED',
          value: null,
          unknownReason: 'tracking-disabled',
        }),
      ),
    ).toEqual({ kind: 'unknown', reason: 'tracking-disabled' });
  });

  it('reads a positive count as that count', () => {
    expect(readCampaignMetric(metric({ value: 24 }))).toEqual({
      kind: 'known',
      value: 24,
    });
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'reads %p as unreadable rather than as a count',
    (value) => {
      expect(readCampaignMetric(metric({ value }))).toEqual({
        kind: 'unknown',
        reason: 'unreadable',
      });
    },
  );

  it('does not let a stated reason override a figure that was actually published', () => {
    expect(
      readCampaignMetric(
        metric({ value: 7, unknownReason: 'provider-event-missing' }),
      ),
    ).toEqual({ kind: 'known', value: 7 });
  });
});
