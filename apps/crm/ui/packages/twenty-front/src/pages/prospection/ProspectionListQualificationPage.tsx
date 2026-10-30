import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useParams } from 'react-router-dom';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconListCheck } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { ProspectionObjectsGate } from '@/prospection/components/ProspectionObjectsGate';
import { ReceivedListMembersTable } from '@/prospection/components/ReceivedListMembersTable';
import { PROSPECTION_RECEIVED_LISTS_PATH } from '@/prospection/constants/ProspectionRoutePaths';
import { useReceivedListQualification } from '@/prospection/hooks/useReceivedListQualification';
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

type ProspectionListQualificationContentProps = {
  messageListId: string | undefined;
};

const ProspectionListQualificationContent = ({
  messageListId,
}: ProspectionListQualificationContentProps) => {
  const { t } = useLingui();

  const {
    list,
    rows,
    contactCount,
    withEmailCount,
    withoutCompanyCount,
    optedOutCount,
    oppositionCoverage,
    loading,
    error,
    hasMoreMembers,
    fetchMoreMembers,
  } = useReceivedListQualification({ messageListId });

  const trimmedName = list?.name?.trim();
  const listName = isNonEmptyString(trimmedName)
    ? trimmedName
    : t`Untitled list`;

  // Until the list is read, its name is not known either, and a placeholder
  // name over real counters would read as the list's own name.
  if (loading && !isDefined(list)) {
    return (
      <StyledContent>
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      </StyledContent>
    );
  }

  // The list itself could not be read, so nothing below it would mean
  // anything: an empty table here would read as an empty list.
  if (!loading && !isDefined(list)) {
    return (
      <StyledContent>
        <ProspectionNote role="alert">
          {isDefined(error) ? (
            <Trans>Some data is unavailable.</Trans>
          ) : (
            <Trans>List not found.</Trans>
          )}
        </ProspectionNote>
      </StyledContent>
    );
  }

  const counters: ProspectionCounter[] = [
    { key: 'contacts', label: t`Contacts`, count: contactCount },
    { key: 'with-email', label: t`With an email`, count: withEmailCount },
    { key: 'no-company', label: t`Without a company`, count: withoutCompanyCount },
    { key: 'opted-out', label: t`Opted out`, count: optedOutCount },
  ];

  return (
    <StyledContent>
      <Section.Root>
        {/* Origin, legal basis and collection date are not held against a
            received contact, so the screen says so instead of implying them. */}
        <Section.Header title={listName} description={t`Origin not recorded`} />
        <ProspectionCounters counters={counters} />
      </Section.Root>

      {isDefined(error) && (
        <ProspectionNote role="alert">
          <Trans>Some data is unavailable.</Trans>
        </ProspectionNote>
      )}

      {oppositionCoverage !== 'complete' && (
        <ProspectionNote>
          {oppositionCoverage === 'unavailable' ? (
            <Trans>Opt-outs unavailable.</Trans>
          ) : (
            <Trans>Opt-outs partly checked.</Trans>
          )}
        </ProspectionNote>
      )}

      {loading && rows.length === 0 && (
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      )}

      {!loading && rows.length === 0 && !isDefined(error) && (
        <ProspectionNote>
          <Trans>No contact in this list.</Trans>
        </ProspectionNote>
      )}

      {rows.length > 0 && (
        <Section.Root>
          <ReceivedListMembersTable rows={rows} />
          {hasMoreMembers && (
            <StyledFooter>
              <Button
                variant="outline"
                size="sm"
                loading={loading}
                onClick={fetchMoreMembers}
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

export const ProspectionListQualificationPage = () => {
  const { t } = useLingui();
  const { messageListId } = useParams();

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          icon={<IconListCheck />}
          links={[
            { children: t`Reception`, href: PROSPECTION_RECEIVED_LISTS_PATH },
            { children: t`Qualification` },
          ]}
        />
      }
    >
      <ProspectionObjectsGate>
        <ProspectionListQualificationContent messageListId={messageListId} />
      </ProspectionObjectsGate>
    </PageCardLayout>
  );
};
