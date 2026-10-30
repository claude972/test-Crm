import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Link, useSearchParams } from 'react-router-dom';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconInbox } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { CampaignAudiencesSection } from '@/prospection/components/CampaignAudiencesSection';
import { HermesCapabilitiesNote } from '@/prospection/components/HermesCapabilitiesNote';
import { HermesImportBatchDetail } from '@/prospection/components/HermesImportBatchDetail';
import { HermesImportBatchForm } from '@/prospection/components/HermesImportBatchForm';
import { HermesImportBatchesTable } from '@/prospection/components/HermesImportBatchesTable';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionDiagnostic } from '@/prospection/components/ProspectionDiagnostic';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import {
  PROSPECTION_IMPORT_BATCH_SEARCH_PARAM,
  PROSPECTION_RECEPTION_PATH,
} from '@/prospection/constants/ProspectionRoutePaths';
import { useHermesImportBatches } from '@/prospection/hooks/useHermesImportBatches';
import { buildHermesStateCounts } from '@/prospection/utils/buildHermesCounts';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledBackLink = styled(Link)`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  text-decoration: none;
  width: fit-content;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const ProspectionImportBatchesContent = () => {
  const { t } = useLingui();
  const [searchParams] = useSearchParams();

  const selectedBatchId = searchParams.get(
    PROSPECTION_IMPORT_BATCH_SEARCH_PARAM,
  );

  const { status, state, problem, failureMessage, isRefreshing, refetch } =
    useHermesImportBatches();

  if (status === 'loading') {
    return (
      <StyledContent>
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      </StyledContent>
    );
  }

  // An authorisation answer, said as one: the operations are restricted to
  // live workspace members with unrestricted administrator permissions.
  if (status === 'denied') {
    return (
      <StyledContent>
        <ProspectionNote role="alert">
          <Trans>
            Not authorised: unrestricted workspace administrators only.
          </Trans>
        </ProspectionNote>
        <ProspectionNote>
          <Trans>API keys, apps and impersonated sessions are refused.</Trans>
        </ProspectionNote>
        <CampaignAudiencesSection />
      </StyledContent>
    );
  }

  // The reception could not be read. It is shown as unknown, never as an
  // empty reception, and nothing offers to stage into it.
  if (status === 'unreadable' || !isDefined(state)) {
    return (
      <StyledContent>
        <HermesPayloadProblemNote
          problem={problem ?? 'missing'}
          subject={t`Reception`}
        />
        <ProspectionNote>
          <Trans>Staging opens once the reception can be read.</Trans>
        </ProspectionNote>
        <ProspectionDiagnostic message={failureMessage} />
        <StyledActions>
          <Button
            variant="outline"
            size="sm"
            loading={isRefreshing}
            onClick={refetch}
          >
            {t`Retry`}
          </Button>
        </StyledActions>
        <CampaignAudiencesSection />
      </StyledContent>
    );
  }

  if (isNonEmptyString(selectedBatchId)) {
    const batch = state.batches.find(({ id }) => id === selectedBatchId);

    return (
      <StyledContent>
        <StyledBackLink to={PROSPECTION_RECEPTION_PATH}>
          {t`Back to the reception`}
        </StyledBackLink>

        {isDefined(batch) ? (
          <HermesImportBatchDetail
            batch={batch}
            capabilities={state.capabilities}
            onReload={refetch}
          />
        ) : (
          <ProspectionNote role="alert">
            <Trans>Batch not found in this workspace.</Trans>
          </ProspectionNote>
        )}
      </StyledContent>
    );
  }

  const counts = buildHermesStateCounts(state);

  const counters: ProspectionCounter[] = [
    { key: 'batches', label: t`Batches`, count: counts.batches },
    { key: 'rows', label: t`Staged rows`, count: counts.rows },
    { key: 'qualified', label: t`Qualified`, count: counts.qualifiedRows },
    { key: 'suppressed', label: t`Suppressed`, count: counts.suppressedRows },
  ];

  return (
    <StyledContent>
      <Section.Root>
        <Section.Header
          title={t`Reception`}
          description={t`Batches staged for this workspace, with the status the server gave each row.`}
        />
        <ProspectionCounters counters={counters} />
        <HermesCapabilitiesNote capabilities={state.capabilities} />
      </Section.Root>

      {state.unreadableBatchCount > 0 && (
        <ProspectionNote role="alert">
          <Trans>Some batches could not be read and are not listed.</Trans>
        </ProspectionNote>
      )}

      {state.batches.length === 0 ? (
        <ProspectionNote>
          <Trans>No batch staged yet.</Trans>
        </ProspectionNote>
      ) : (
        <Section.Root>
          <HermesImportBatchesTable batches={state.batches} />
        </Section.Root>
      )}

      <HermesImportBatchForm
        retainedBatchCount={state.batches.length}
        onStaged={refetch}
      />

      <CampaignAudiencesSection />
    </StyledContent>
  );
};

// Route component for /prospection. The reception reads the Hermes import
// state; the campaign audiences below it read the native messageList object.
// The two are deliberately separate: an audience list is already qualified and
// is not an incoming batch.
export const ProspectionImportBatchesPage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconInbox />} title={t`Prospection`} />}
    >
      <ProspectionImportBatchesContent />
    </PageCardLayout>
  );
};
