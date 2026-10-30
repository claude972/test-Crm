import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useParams } from 'react-router-dom';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconUsers } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { CampaignAudienceMembersTable } from '@/prospection/components/CampaignAudienceMembersTable';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { ProspectionObjectsGate } from '@/prospection/components/ProspectionObjectsGate';
import { PROSPECTION_RECEPTION_PATH } from '@/prospection/constants/ProspectionRoutePaths';
import { useCampaignAudienceMembers } from '@/prospection/hooks/useCampaignAudienceMembers';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

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

type ProspectionCampaignAudienceContentProps = {
  messageListId: string | undefined;
};

const ProspectionCampaignAudienceContent = ({
  messageListId,
}: ProspectionCampaignAudienceContentProps) => {
  const { t } = useLingui();

  const {
    list,
    rows,
    contactCount,
    withEmailCount,
    withoutCompanyCount,
    registerCoverage,
    loading,
    error,
    hasMoreMembers,
    fetchMoreMembers,
  } = useCampaignAudienceMembers({ messageListId });

  const trimmedName = list?.name?.trim();
  const audienceName = isNonEmptyString(trimmedName)
    ? trimmedName
    : t`Untitled audience`;

  // Until the audience is read, its name is not known either, and a
  // placeholder name over real counters would read as the audience's own name.
  if (loading && !isDefined(list)) {
    return (
      <StyledContent>
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      </StyledContent>
    );
  }

  // The audience itself could not be read, so nothing below it would mean
  // anything: an empty table here would read as an empty audience.
  if (!loading && !isDefined(list)) {
    return (
      <StyledContent>
        <ProspectionNote role="alert">
          {isGraphqlErrorOfType(error, 'FORBIDDEN') ? (
            <Trans>Not authorised to read this audience.</Trans>
          ) : isDefined(error) ? (
            <Trans>Some data is unavailable.</Trans>
          ) : (
            <Trans>Audience not found.</Trans>
          )}
        </ProspectionNote>
      </StyledContent>
    );
  }

  const counters: ProspectionCounter[] = [
    { key: 'contacts', label: t`Contacts`, count: contactCount },
    { key: 'with-email', label: t`With an email`, count: withEmailCount },
    {
      key: 'no-company',
      label: t`Without a company`,
      count: withoutCompanyCount,
    },
  ];

  return (
    <StyledContent>
      <Section.Root>
        {/* An audience list carries no import origin, no legal basis and no
            collection date, so the screen says so instead of implying them. */}
        <Section.Header
          title={audienceName}
          description={t`Already qualified for campaigns. No import origin recorded.`}
        />
        <ProspectionCounters counters={counters} />
      </Section.Root>

      {isGraphqlErrorOfType(error, 'FORBIDDEN') ? (
        <ProspectionNote role="alert">
          <Trans>Not authorised to read this audience.</Trans>
        </ProspectionNote>
      ) : (
        isDefined(error) && (
          <ProspectionNote role="alert">
            <Trans>Some data is unavailable.</Trans>
          </ProspectionNote>
        )
      )}

      {/* How much of the suppression register was read. The column itself
          shows each entry as it is; no "may be contacted" verdict is formed
          here, because that depends on the reason and the topic scope and is
          decided server side. */}
      {registerCoverage !== 'complete' && (
        <ProspectionNote>
          {registerCoverage === 'unavailable' ? (
            <Trans>Suppression register unavailable.</Trans>
          ) : (
            <Trans>Suppression register partly read.</Trans>
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
          <Trans>No contact in this audience.</Trans>
        </ProspectionNote>
      )}

      {rows.length > 0 && (
        <Section.Root>
          <CampaignAudienceMembersTable rows={rows} />
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

// One already-qualified campaign audience, read from messageList. Read-only:
// nothing here imports, qualifies or sends anything.
export const ProspectionCampaignAudiencePage = () => {
  const { t } = useLingui();
  const { messageListId } = useParams();

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          icon={<IconUsers />}
          links={[
            { children: t`Prospection`, href: PROSPECTION_RECEPTION_PATH },
            { children: t`Campaign audience` },
          ]}
        />
      }
    >
      <ProspectionObjectsGate>
        <ProspectionCampaignAudienceContent messageListId={messageListId} />
      </ProspectionObjectsGate>
    </PageCardLayout>
  );
};
