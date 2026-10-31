import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useMemo, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignDraftForm } from '@/prospection/components/HermesCampaignDraftForm';
import { HermesCollectionOriginTag } from '@/prospection/components/HermesCollectionOriginTag';
import { HermesImportRowStatusTag } from '@/prospection/components/HermesImportRowStatusTag';
import { HermesInboundProvenancePanel } from '@/prospection/components/HermesInboundProvenancePanel';
import { HermesImportRowsTable } from '@/prospection/components/HermesImportRowsTable';
import { HermesQualificationForm } from '@/prospection/components/HermesQualificationForm';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import {
  HERMES_IMPORT_ROW_STATUSES,
  type HermesImportRowStatus,
} from '@/prospection/types/HermesImportRowStatus';
import { type HermesCapabilities } from '@/prospection/types/HermesImportState';
import { buildHermesBatchCounts } from '@/prospection/utils/buildHermesCounts';
import { useHermesScrapingClassification } from '@/prospection/hooks/useHermesScrapingClassification';
import { readHermesCollectionProvenance } from '@/prospection/utils/readHermesCollectionProvenance';
import {
  isHermesRowQualifiable,
  isHermesRowSelectable,
} from '@/prospection/utils/hermesRowSelection';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

const StyledProvenance = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

const StyledSelectionBar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesImportBatchDetailProps = {
  batch: HermesImportBatch;
  capabilities: HermesCapabilities;
  // Rereads the reception after a call that changed row statuses.
  onReload: () => void;
};

export const HermesImportBatchDetail = ({
  batch,
  capabilities,
  onReload,
}: HermesImportBatchDetailProps) => {
  const { t, i18n } = useLingui();

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const isCampaignFeatureEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );

  const counts = buildHermesBatchCounts(batch);
  const provenance = readHermesCollectionProvenance(batch);
  // The server's classification of this company's signed deposits. Read-only,
  // and it qualifies nothing: see HermesInboundProvenancePanel.
  const classification = useHermesScrapingClassification();
  // Set only once a qualification was CONFIRMED. It is what lets the panel
  // tell a zero that follows a qualification from a zero that precedes any.
  const [hasConfirmedQualification, setHasConfirmedQualification] =
    useState(false);

  // A confirmed qualification changes both what the reception counts and what
  // the classification would classify, so both are reread. The classification
  // is `network-only`, which stops a cache read but never re-runs the query.
  const handleQualified = useCallback(() => {
    setHasConfirmedQualification(true);
    onReload();
    classification.reread();
  }, [classification, onReload]);

  const selectableRows = useMemo(
    () => batch.rows.filter((row) => isHermesRowSelectable(row)),
    [batch.rows],
  );

  // A selection made before a reload can hold ids that are no longer
  // selectable, so what is sent is always intersected with what is on screen.
  // Split in two on purpose: qualification takes staged rows, a draft takes
  // qualified ones, and sending a row the server would ignore would report
  // work that never happened.
  const qualifiableRowIds = useMemo(
    () =>
      selectableRows
        .filter(
          (row) => selectedRowIds.has(row.id) && isHermesRowQualifiable(row),
        )
        .map((row) => row.id),
    [selectableRows, selectedRowIds],
  );

  const eligibleDraftRowIds = useMemo(
    () =>
      selectableRows
        .filter(
          (row) => selectedRowIds.has(row.id) && row.status === 'qualified',
        )
        .map((row) => row.id),
    [selectableRows, selectedRowIds],
  );

  const toggleRow = (rowId: string) =>
    setSelectedRowIds((current) => {
      const next = new Set(current);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });

  const statusCounters: ProspectionCounter[] = HERMES_IMPORT_ROW_STATUSES.map(
    (status: HermesImportRowStatus) => ({
      key: status,
      label: <HermesImportRowStatusTag status={status} />,
      count: counts.byStatus[status],
    }),
  );

  const hasConflictRow = batch.rows.some((row) => row.status === 'conflict');
  const hasUnknownStatusRow = batch.rows.some((row) => row.status === null);

  const formatDate = (value: string | null) => {
    if (!isNonEmptyString(value)) {
      return <StyledMissing>{t`Unknown`}</StyledMissing>;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return <StyledMissing>{t`Unreadable`}</StyledMissing>;
    }

    return i18n.date(date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Section.Root>
        <Section.Header
          title={
            isNonEmptyString(batch.name) ? batch.name : t`Unnamed collection`
          }
          description={t`Where this collection came from, and the status the server gave each row.`}
        />
        {/* Provenance first: the rows below mean something different
            depending on the path the collection arrived through. */}
        <StyledProvenance>
          <dt>{t`Origin`}</dt>
          <dd>
            <HermesCollectionOriginTag origin={provenance.origin} />
          </dd>
          <dt>{t`Collection id`}</dt>
          <dd>
            {isNonEmptyString(provenance.externalBatchId) ? (
              provenance.externalBatchId
            ) : (
              <StyledMissing>{t`Unknown`}</StyledMissing>
            )}
          </dd>
          <dt>{t`Source`}</dt>
          <dd>
            {isNonEmptyString(provenance.sourceUrl) ? (
              provenance.sourceUrl
            ) : (
              <StyledMissing>{t`Unknown`}</StyledMissing>
            )}
          </dd>
          <dt>{t`Fingerprint`}</dt>
          <dd>
            {isNonEmptyString(provenance.fingerprint) ? (
              provenance.fingerprint
            ) : (
              <StyledMissing>{t`Unknown`}</StyledMissing>
            )}
          </dd>
          <dt>{t`Collected`}</dt>
          <dd>{formatDate(provenance.collectedAt)}</dd>
          <dt>{t`Received`}</dt>
          <dd>{formatDate(provenance.createdAt)}</dd>
        </StyledProvenance>
      </Section.Root>

      {/* The server's own classification of this reception, next to the
          provenance read off the batch. It answers what the batch fields
          cannot: which signed connection the deposit is attributable to, and
          whether that attribution is verified, edited or absent. */}
      <HermesInboundProvenancePanel
        batchId={batch.id}
        state={classification.state}
        hasConfirmedQualification={hasConfirmedQualification}
      />

      <Section.Root>
        <Section.Header title={t`Row statuses`} />
        <ProspectionCounters counters={statusCounters} />
        {hasUnknownStatusRow && (
          <ProspectionNote role="alert">
            <Trans>
              Some rows carry a status outside the contract. They are shown as
              unknown and cannot be acted on.
            </Trans>
          </ProspectionNote>
        )}
        {hasConflictRow && (
          <ProspectionNote>
            <Trans>
              A conflict row matches a CRM record that is ambiguous, archived
              or inconsistent. It needs review before qualification.
            </Trans>
          </ProspectionNote>
        )}
      </Section.Root>

      {!batch.areRowsReadable && (
        <ProspectionNote role="alert">
          <Trans>
            Rows unreadable: this collection holds an unknown number.
          </Trans>
        </ProspectionNote>
      )}

      {batch.areRowsReadable && batch.unreadableRowCount > 0 && (
        <ProspectionNote role="alert">
          {t`${i18n.number(batch.unreadableRowCount)} rows could not be read and are not listed.`}
        </ProspectionNote>
      )}

      {batch.areRowsReadable && batch.rows.length === 0 && (
        <ProspectionNote>
          <Trans>No row in this collection.</Trans>
        </ProspectionNote>
      )}

      {batch.rows.length > 0 && (
        <Section.Root>
          <StyledSelectionBar>
            <ProspectionNote>
              {t`${i18n.number(selectedRowIds.size)} of ${i18n.number(selectableRows.length)} selectable rows picked.`}
            </ProspectionNote>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelectedRowIds(new Set(selectableRows.map((row) => row.id)))
              }
            >
              {t`Select all`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRowIds(new Set())}
            >
              {t`Clear`}
            </Button>
          </StyledSelectionBar>
          <HermesImportRowsTable
            rows={batch.rows}
            selectedRowIds={selectedRowIds}
            onToggleRow={toggleRow}
          />
        </Section.Root>
      )}

      <HermesQualificationForm
        batchId={batch.id}
        selectedRowIds={qualifiableRowIds}
        onQualified={handleQualified}
      />

      {/* An unknown capability is never read as an available one, and a
          missing campaign feature means no draft call would go through, so
          there is no button for it. */}
      {capabilities.nativeCampaignDrafts === true && isCampaignFeatureEnabled ? (
        <HermesCampaignDraftForm eligibleRowIds={eligibleDraftRowIds} />
      ) : (
        <ProspectionNote>
          {capabilities.nativeCampaignDrafts === false ? (
            <Trans>Campaign drafts unavailable in this workspace.</Trans>
          ) : !isDefined(capabilities.nativeCampaignDrafts) ? (
            <Trans>Campaign draft capability unknown.</Trans>
          ) : (
            <Trans>Campaign drafts need the campaign feature turned on.</Trans>
          )}
        </ProspectionNote>
      )}
    </>
  );
};
