import { useLingui } from '@lingui/react/macro';

import { HermesObjectRecordListSection } from '@/hermes-shell/dashboard/components/HermesObjectRecordListSection';
import { HermesPipelineSection } from '@/hermes-shell/dashboard/components/HermesPipelineSection';
import { HermesVolumeSection } from '@/hermes-shell/dashboard/components/HermesVolumeSection';

// Every section reads the workspace's own metadata, permissions and records.
// Nothing here is seeded or illustrative: a section with no data to show says
// so rather than filling itself.
export const HermesOperationsDashboard = () => {
  const { t } = useLingui();

  return (
    <>
      <HermesVolumeSection />
      <HermesPipelineSection />
      <HermesObjectRecordListSection
        title={t`Opportunities by close date`}
        objectNameSingular="opportunity"
        selectFieldName="stage"
        selectColumnLabel={t`Stage`}
        dateFieldName="closeDate"
        dateColumnLabel={t`Close date`}
        orderByFieldName="closeDate"
        orderByDirection="AscNullsLast"
        emptyLabel={t`No opportunity yet.`}
      />
      <HermesObjectRecordListSection
        title={t`Tasks by due date`}
        objectNameSingular="task"
        selectFieldName="status"
        selectColumnLabel={t`Status`}
        dateFieldName="dueAt"
        dateColumnLabel={t`Due date`}
        orderByFieldName="dueAt"
        orderByDirection="AscNullsLast"
        emptyLabel={t`No task yet.`}
      />
    </>
  );
};
