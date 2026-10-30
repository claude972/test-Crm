import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { HermesCampaignMetricValue } from '@/hermes-campaigns-ui/components/HermesCampaignMetricValue';
import { type HermesCampaignMetric } from '@/hermes-campaigns-ui/types/HermesCampaignResult';

const renderMetric = (metric: HermesCampaignMetric) =>
  render(
    <I18nProvider i18n={i18n}>
      <HermesCampaignMetricValue metric={metric} />
    </I18nProvider>,
  );

describe('HermesCampaignMetricValue', () => {
  // The rendering difference the results section exists for: a zero and an
  // unavailable measure must not look alike.
  it('renders a published zero as the digit zero', () => {
    renderMetric({
      evidence: 'SMTP_ACCEPTED',
      value: 0,
      unknownReason: null,
      note: null,
    });

    expect(screen.getByText('0')).toBeVisible();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('renders a missing measure as the word unknown, never as a zero', () => {
    renderMetric({
      evidence: 'PROVIDER_DELIVERED',
      value: null,
      unknownReason: 'provider-event-missing',
      note: null,
    });

    expect(screen.getByText('Unknown')).toBeVisible();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  // The state is carried by a word and a label, not by a colour: a reader who
  // sees no colour, and a reader who hears the page, both get the reason.
  it('states why the measure is unknown, in words', () => {
    renderMetric({
      evidence: 'OPEN_OBSERVED',
      value: null,
      unknownReason: 'tracking-disabled',
      note: null,
    });

    expect(
      screen.getByLabelText(
        'Unknown — open tracking is off, so there is nothing to count.',
      ),
    ).toBeVisible();
  });

  it('renders a count that is not a count as unknown', () => {
    renderMetric({
      evidence: 'REPLY_CORRELATED',
      value: -3,
      unknownReason: null,
      note: null,
    });

    expect(screen.getByText('Unknown')).toBeVisible();
    expect(
      screen.getByLabelText('Unknown — what was published was not a count.'),
    ).toBeVisible();
  });
});
