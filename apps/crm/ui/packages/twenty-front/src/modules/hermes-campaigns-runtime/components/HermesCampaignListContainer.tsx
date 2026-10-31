import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconArrowLeft } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignRuntimeContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
import { useHermesRuntimeCampaignList } from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignList';
import { HermesCampaignListView } from '@/hermes-campaigns-ui/components/HermesCampaignListView';

const StyledOpened = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledBackRow = styled.div`
  display: flex;
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[4]} 0;
`;

export type HermesCampaignListContainerProps = {
  // Where opening a campaign should go. Optional on purpose: with no callback
  // the container opens the campaign in place, so the route works on its own
  // and a campaign is never announced with no way to reach it. Pass this to
  // route to a dedicated campaign URL instead.
  onOpenCampaign?: (campaignId: string) => void;
};

// The campaigns of this company, with creating one and reopening one.
//
// Both journeys end somewhere real. Creating a draft opens it immediately,
// because a draft the operator is told to go and fill in, with no way to get
// there, is the dead end this container exists to close.
//
// Nothing here emits. Listing is a read, and a new campaign is an empty
// draft: no audience, no content, no sender and nothing queued.
export const HermesCampaignListContainer = ({
  onOpenCampaign,
}: HermesCampaignListContainerProps = {}) => {
  const { t } = useLingui();
  const {
    campaignsLoad,
    totalCount,
    createState,
    onCreateCampaign,
    isCreateBlocked,
    onRecheckAfterUncertainCreation,
    hasNextPage,
    isLoadingMore,
    onLoadMore,
    onRetry,
  } = useHermesRuntimeCampaignList();

  // Which campaign is open when the caller wired no navigation. Held here
  // rather than in a URL so the container needs no route parameter.
  const [openedCampaignId, setOpenedCampaignId] = useState<string | null>(null);

  const openCampaign = useCallback(
    (campaignId: string) => {
      if (isDefined(onOpenCampaign)) {
        onOpenCampaign(campaignId);

        return;
      }

      setOpenedCampaignId(campaignId);
    },
    [onOpenCampaign],
  );

  const createCampaign = useCallback(
    (name: string) => {
      void onCreateCampaign(name).then((campaignId) => {
        // Only a campaign the server actually confirmed is opened. An
        // unknown outcome opens nothing: the list is re-read instead, so the
        // operator can see whether it exists rather than being sent to a
        // campaign that may not.
        if (isDefined(campaignId)) {
          openCampaign(campaignId);
        }
      });
    },
    [onCreateCampaign, openCampaign],
  );

  if (isDefined(openedCampaignId)) {
    // Opened in place, so the way back has to be in place too: a campaign
    // with no route out would just move the dead end one screen along.
    return (
      <StyledOpened>
        <StyledBackRow>
          <Button
            variant="outline"
            size="sm"
            startIcon={<IconArrowLeft />}
            onClick={() => setOpenedCampaignId(null)}
          >
            {t`Back to the campaigns`}
          </Button>
        </StyledBackRow>

        <HermesCampaignRuntimeContainer campaignId={openedCampaignId} />
      </StyledOpened>
    );
  }

  return (
    <HermesCampaignListView
      campaignsLoad={campaignsLoad}
      onRetry={onRetry}
      onOpenCampaign={openCampaign}
      onCreateCampaign={createCampaign}
      isCreating={createState.kind === 'creating'}
      createFailure={
        createState.kind === 'failed' || createState.kind === 'unconfirmed'
          ? {
              reasonCode: createState.reasonCode,
              reason: createState.reason,
            }
          : null
      }
      isCreateUnconfirmed={createState.kind === 'unconfirmed'}
      isCreateBlocked={isCreateBlocked}
      onRecheckAfterUncertainCreation={() => {
        void onRecheckAfterUncertainCreation();
      }}
      hasNextPage={hasNextPage}
      isLoadingMore={isLoadingMore}
      onLoadMore={() => {
        void onLoadMore();
      }}
      totalCount={totalCount}
    />
  );
};
