import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignMetricValue } from '@/hermes-campaigns-ui/components/HermesCampaignMetricValue';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import {
  type HermesCampaignEvidence,
  type HermesCampaignMetric,
} from '@/hermes-campaigns-ui/types/HermesCampaignResult';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledEvidence = styled.code`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

// The order the six facts are read in: what we handed over, what was
// attested, what failed, what we are not sure about, what came back, what was
// observed.
const EVIDENCE_ORDER: readonly HermesCampaignEvidence[] = [
  'SMTP_ACCEPTED',
  'PROVIDER_DELIVERED',
  'DELIVERY_FAILED',
  'OUTCOME_UNCERTAIN',
  'REPLY_CORRELATED',
  'OPEN_OBSERVED',
];

type HermesCampaignResultsSectionProps = {
  load: HermesCampaignLoad<HermesCampaignMetric[]>;
  onRetry?: () => void;
};

export const HermesCampaignResultsSection = ({
  load,
  onRetry,
}: HermesCampaignResultsSectionProps) => {
  const { t } = useLingui();

  const metrics = load.kind === 'ready' ? load.value : [];

  const labels: Record<HermesCampaignEvidence, string> = {
    SMTP_ACCEPTED: t`Accepted by the SMTP server`,
    PROVIDER_DELIVERED: t`Delivery attested`,
    DELIVERY_FAILED: t`Failure established`,
    OUTCOME_UNCERTAIN: t`Outcome uncertain`,
    REPLY_CORRELATED: t`Replies correlated`,
    OPEN_OBSERVED: t`Opens observed`,
  };

  const meanings: Record<HermesCampaignEvidence, string> = {
    SMTP_ACCEPTED: t`The transport took the message. That is a handover, not a delivery.`,
    PROVIDER_DELIVERED: t`An authenticated provider event attested the delivery.`,
    DELIVERY_FAILED: t`The failure is established, with its cause.`,
    OUTCOME_UNCERTAIN: t`Handed over, outcome never settled. It is reconciled, never resent blind.`,
    REPLY_CORRELATED: t`A reply was tied back to this campaign.`,
    OPEN_OBSERVED: t`An image or a link was requested. That is not a human reading.`,
  };

  // Shown in the fixed order above, so a measure the server stopped
  // publishing leaves a visible gap rather than silently reordering the rest.
  const orderedMetrics = EVIDENCE_ORDER.map((evidence) =>
    metrics.find((metric) => metric.evidence === evidence),
  );

  return (
    <Section.Root>
      <Section.Header
        title={t`Results`}
        description={t`Acceptance, delivery and opening are separate facts. Unknown is not zero.`}
      />

      <HermesCampaignLoadView
        load={load}
        emptyTitle={t`No result`}
        emptyDescription={t`Nothing has been emitted for this campaign, so there is nothing to measure.`}
        notConfiguredTitle={t`Measures not available`}
        notConfiguredDescription={t`Results need an outgoing connection and the provider events that go with it.`}
        failedTitle={t`The results could not be read`}
        onRetry={onRetry}
      >
        <StyledGrid>
          {EVIDENCE_ORDER.map((evidence, index) => {
            const metric = orderedMetrics[index];

            return (
              <StyledCard key={evidence}>
                <StyledLabel>{labels[evidence]}</StyledLabel>
                {/* A measure the server did not publish is unknown, never a
                    zero filled in by the interface. */}
                <HermesCampaignMetricValue
                  metric={
                    metric ?? {
                      evidence,
                      value: null,
                      unknownReason: 'not-published',
                      note: null,
                    }
                  }
                />
                <StyledEvidence>{evidence}</StyledEvidence>
                <HermesCampaignNote>
                  {isNonEmptyString(metric?.note?.trim())
                    ? metric?.note
                    : meanings[evidence]}
                </HermesCampaignNote>
              </StyledCard>
            );
          })}
        </StyledGrid>

        <HermesCampaignNote>
          <Trans>
            An acceptance is not a delivery, an observed open is not a human
            reading, and a figure the server did not publish is unknown rather
            than zero.
          </Trans>
        </HermesCampaignNote>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
