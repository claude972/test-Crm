import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { CampaignAudiencesTable } from '@/prospection/components/CampaignAudiencesTable';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { ProspectionObjectsGate } from '@/prospection/components/ProspectionObjectsGate';
import { useCampaignAudiences } from '@/prospection/hooks/useCampaignAudiences';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

const StyledFooter = styled.div`
  display: flex;
  justify-content: center;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const CampaignAudiencesContent = () => {
  const { t } = useLingui();

  const {
    rows,
    listCount,
    contactCount,
    loading,
    error,
    hasMoreLists,
    fetchMoreLists,
  } = useCampaignAudiences();

  const counters: ProspectionCounter[] = [
    { key: 'audiences', label: t`Audiences`, count: listCount },
    { key: 'contacts', label: t`Contacts`, count: contactCount },
  ];

  return (
    <Section.Root>
      {/* These lists are campaign audiences, already qualified. They are not
          an incoming batch, and nothing here imports anything. */}
      <Section.Header
        title={t`Campaign audiences`}
        description={t`Audience lists already qualified for campaigns. Read-only here.`}
      />
      <ProspectionCounters counters={counters} />

      {/* An authorisation answer reads as one, not as a technical failure. */}
      {isGraphqlErrorOfType(error, 'FORBIDDEN') ? (
        <ProspectionNote role="alert">
          <Trans>Not authorised to read campaign audiences.</Trans>
        </ProspectionNote>
      ) : (
        isDefined(error) && (
          <ProspectionNote role="alert">
            <Trans>Some data is unavailable.</Trans>
          </ProspectionNote>
        )
      )}

      {loading && rows.length === 0 && (
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      )}

      {!loading && rows.length === 0 && !isDefined(error) && (
        <ProspectionNote>
          <Trans>No campaign audience yet.</Trans>
        </ProspectionNote>
      )}

      {rows.length > 0 && (
        <>
          <CampaignAudiencesTable rows={rows} />
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
        </>
      )}
    </Section.Root>
  );
};

// The objects are checked before anything queries them: the record hooks throw
// when one is absent from the workspace.
export const CampaignAudiencesSection = () => (
  <ProspectionObjectsGate>
    <CampaignAudiencesContent />
  </ProspectionObjectsGate>
);
