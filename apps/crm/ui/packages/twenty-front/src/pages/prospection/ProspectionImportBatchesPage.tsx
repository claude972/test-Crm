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
import { HermesImportBatchesTable } from '@/prospection/components/HermesImportBatchesTable';
import { HermesIntakeSection } from '@/prospection/components/HermesIntakeSection';
import { HermesManualDepositSection } from '@/prospection/components/HermesManualDepositSection';
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
import { useHermesIntakeState } from '@/prospection/hooks/useHermesIntakeState';
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

const HermesCollectionsContent = () => {
  const { t } = useLingui();
  const [searchParams] = useSearchParams();

  const selectedBatchId = searchParams.get(
    PROSPECTION_IMPORT_BATCH_SEARCH_PARAM,
  );

  const { status, state, problem, failureMessage, isRefreshing, refetch } =
    useHermesImportBatches();

  // Read first and rendered first: the automatic entry point is how
  // collections arrive, so its state is the first thing the screen says even
  // when the list below cannot be read.
  const intakeState = useHermesIntakeState();

  if (status === 'loading') {
    return (
      <StyledContent>
        <HermesIntakeSection state={intakeState} />
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
        <HermesIntakeSection state={intakeState} />
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

  // The collections could not be read. Shown as unknown, never as no
  // collection, and nothing offers to deposit into it.
  if (status === 'unreadable' || !isDefined(state)) {
    return (
      <StyledContent>
        <HermesIntakeSection state={intakeState} />
        <HermesPayloadProblemNote
          problem={problem ?? 'missing'}
          subject={t`Collections`}
        />
        <ProspectionNote>
          <Trans>
            The manual deposit opens once the collections can be read.
          </Trans>
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
          {t`Back to collections`}
        </StyledBackLink>

        {isDefined(batch) ? (
          <HermesImportBatchDetail
            batch={batch}
            capabilities={state.capabilities}
            onReload={refetch}
          />
        ) : (
          <ProspectionNote role="alert">
            <Trans>Collection not found in this workspace.</Trans>
          </ProspectionNote>
        )}
      </StyledContent>
    );
  }

  const counts = buildHermesStateCounts(state);

  const counters: ProspectionCounter[] = [
    { key: 'collections', label: t`Collections`, count: counts.batches },
    { key: 'rows', label: t`Rows received`, count: counts.rows },
    { key: 'qualified', label: t`Qualified`, count: counts.qualifiedRows },
    { key: 'suppressed', label: t`Suppressed`, count: counts.suppressedRows },
  ];

  return (
    <StyledContent>
      <HermesIntakeSection state={intakeState} />

      <Section.Root>
        <Section.Header
          title={t`Collections received`}
          description={t`Collections held for this workspace, whatever path they came in through, with the status the server gave each row.`}
        />
        <ProspectionCounters counters={counters} />
        <HermesCapabilitiesNote capabilities={state.capabilities} />
      </Section.Root>

      {state.unreadableBatchCount > 0 && (
        <ProspectionNote role="alert">
          <Trans>Some collections could not be read and are not listed.</Trans>
        </ProspectionNote>
      )}

      {state.batches.length === 0 ? (
        <ProspectionNote>
          <Trans>No collection received yet.</Trans>
        </ProspectionNote>
      ) : (
        <Section.Root>
          <HermesImportBatchesTable batches={state.batches} />
        </Section.Root>
      )}

      {/* Folded and placed last: kept for a collection the entry point did
          not bring in, and no longer presented as the way in. */}
      <HermesManualDepositSection
        retainedBatchCount={state.batches.length}
        onStaged={refetch}
      />

      <CampaignAudiencesSection />
    </StyledContent>
  );
};

// Route component for /prospection: the Hermes collections surface. The
// automatic entry point comes first, the collections already received come
// next, and the manual JSON deposit is kept folded underneath them. The
// campaign audiences below read the native messageList object and are
// deliberately separate: an audience list is already qualified and is not an
// incoming collection.
//
// The exported name and the file name are unchanged on purpose: the route
// table and the navigation import them and belong to another owner.
export const ProspectionImportBatchesPage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconInbox />} title={t`Hermès collections`} />
      }
    >
      <HermesCollectionsContent />
    </PageCardLayout>
  );
};
