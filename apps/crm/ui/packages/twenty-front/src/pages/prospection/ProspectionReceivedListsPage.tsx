import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconInbox } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { ProspectionObjectsGate } from '@/prospection/components/ProspectionObjectsGate';
import { ReceivedListsTable } from '@/prospection/components/ReceivedListsTable';
import { useReceivedLists } from '@/prospection/hooks/useReceivedLists';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: center;
`;

const ProspectionReceivedListsContent = () => {
  const { t } = useLingui();

  const {
    rows,
    listCount,
    contactCount,
    loading,
    error,
    hasMoreLists,
    fetchMoreLists,
  } = useReceivedLists();

  const counters: ProspectionCounter[] = [
    { key: 'lists', label: t`Lists`, count: listCount },
    { key: 'contacts', label: t`Contacts`, count: contactCount },
  ];

  return (
    <StyledContent>
      <Section.Root>
        <Section.Header title={t`Received lists`} />
        <ProspectionCounters counters={counters} />
      </Section.Root>

      {isDefined(error) && (
        <ProspectionNote role="alert">
          <Trans>Some data is unavailable.</Trans>
        </ProspectionNote>
      )}

      {loading && rows.length === 0 && (
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      )}

      {!loading && rows.length === 0 && !isDefined(error) && (
        <ProspectionNote>
          <Trans>No list received yet.</Trans>
        </ProspectionNote>
      )}

      {rows.length > 0 && (
        <Section.Root>
          <ReceivedListsTable rows={rows} />
          {hasMoreLists && (
            <StyledFooter>
              <Button
                variant="outline"
                size="sm"
                loading={loading}
                onClick={fetchMoreLists}
              >
                {t`Load more`}
              </Button>
            </StyledFooter>
          )}
        </Section.Root>
      )}
    </StyledContent>
  );
};

export const ProspectionReceivedListsPage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconInbox />} title={t`Reception`} />
      }
    >
      <ProspectionObjectsGate>
        <ProspectionReceivedListsContent />
      </ProspectionObjectsGate>
    </PageCardLayout>
  );
};
