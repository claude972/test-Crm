import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconClock,
  IconFileText,
  IconPlus,
  IconSend,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';
import { Banner, Loader } from 'kovaa-lab-ui/primitives/feedback';
import { Button, Field, Input } from 'kovaa-lab-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import { type HermesCampaignListEntry } from '@/hermes-campaigns-ui/types/HermesCampaignListEntry';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesCampaignState } from '@/hermes-campaigns-ui/types/HermesCampaignJourney';

// One icon and one colour per state, so none of the five reads like another
// without colour. Kept consistent with the campaign screen's own header.
const STATE_PRESENTATION: Record<
  HermesCampaignState,
  {
    color: TagColor;
    variant: NonNullable<TagProps['variant']>;
    Icon: IconComponent;
  }
> = {
  draft: { color: 'gray', variant: 'outline', Icon: IconFileText },
  scheduled: { color: 'blue', variant: 'soft', Icon: IconClock },
  sending: { color: 'amber', variant: 'soft', Icon: IconSend },
  sent: { color: 'jade', variant: 'soft', Icon: IconCheck },
  cancelled: { color: 'gray', variant: 'soft', Icon: IconCircleOff },
};

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    gap: ${themeCssVariables.spacing[3]};
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};
  }
`;

const StyledCreateRow = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledField = styled.div`
  display: grid;
  flex: 1;
  gap: ${themeCssVariables.spacing[1]};
  min-width: min(100%, 240px);
`;

const StyledList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: 0;
`;

const StyledRowButton = styled.button`
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${themeCssVariables.border.color.strong};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.border.color.strong};
    outline-offset: 2px;
  }
`;

const StyledRowHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledRowName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledRowDetail = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow-wrap: anywhere;
`;

// A div rather than a p, for the same reason: it can contain the loader.
const StyledStatus = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export type HermesCampaignListViewProps = {
  campaignsLoad: HermesCampaignLoad<HermesCampaignListEntry[]>;
  onRetry?: () => void;
  // Opens an existing campaign. Absent means nothing is wired to open one,
  // and the rows then say so rather than looking clickable.
  onOpenCampaign?: (campaignId: string) => void;
  // Creates a draft under the name typed here.
  onCreateCampaign?: (name: string) => void;
  isCreating: boolean;
  // Said out loud when a create did not plainly succeed.
  createFailure: { reasonCode: string | null; reason: string | null } | null;
  // True when a create left without a known result: the list may or may not
  // already hold it, so no second attempt is offered on a guess.
  isCreateUnconfirmed: boolean;
  // Shut while a creation is in flight or unresolved. Kept separate from
  // `isCreating` so an unresolved outcome also closes the control.
  isCreateBlocked: boolean;
  // Reconciles an unresolved creation by looking the campaign up by its id.
  onRecheckAfterUncertainCreation?: () => void;
  // The reconciliation is running.
  isReconcilingCreation: boolean;
  // Reconciled and the campaign is genuinely not there. Creating reopens,
  // and the next attempt replays the same id.
  isCreationReconciledAbsent: boolean;
  // The lookup itself failed, so nothing was learned. Not permission to
  // press again.
  reconcileFailure: { reasonCode: string | null; reason: string | null } | null;
  // More campaigns than this page holds.
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  // Campaigns the server counted, which may exceed the page shown.
  totalCount: number | null;
};

// The campaigns of this company, and the way into one.
//
// Driven entirely by props: it calls no API and emits nothing. Opening a
// campaign and creating a draft are both callbacks the caller wires.
export const HermesCampaignListView = ({
  campaignsLoad,
  onRetry,
  onOpenCampaign,
  onCreateCampaign,
  isCreating,
  createFailure,
  isCreateUnconfirmed,
  isCreateBlocked,
  onRecheckAfterUncertainCreation,
  isReconcilingCreation,
  isCreationReconciledAbsent,
  reconcileFailure,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  totalCount,
}: HermesCampaignListViewProps) => {
  const { t, i18n } = useLingui();

  const [draftName, setDraftName] = useState('');

  const stateLabels: Record<HermesCampaignState, string> = {
    draft: t`Draft`,
    scheduled: t`Scheduled`,
    sending: t`Sending`,
    sent: t`Sent`,
    cancelled: t`Cancelled`,
  };

  const isNameUsable = draftName.trim().length > 0;
  const canCreate =
    isDefined(onCreateCampaign) && isNameUsable && !isCreateBlocked;

  return (
    <StyledLayout>
      <Section.Root>
        <Section.Header
          title={t`Campaigns`}
          description={t`The campaigns of this company. Opening one does not send it, and creating one sends nothing.`}
        />

        <StyledCreateRow>
          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Name of the new campaign`}</Field.Label>
            <Input
              value={draftName}
              disabled={isCreating}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={t`For example: Architects, Lyon, first contact`}
            />
            <Field.Description>
              {t`A new campaign is an empty draft: no audience, no content and no sender yet.`}
            </Field.Description>
          </Field.Root>

          <Button
            variant="solid"
            startIcon={<IconPlus />}
            loading={isCreating}
            disabled={!canCreate}
            // Keeps the control in the tab order while it is shut, so the
            // reason stays reachable with a keyboard.
            focusableWhenDisabled
            onClick={() => {
              if (canCreate && isDefined(onCreateCampaign)) {
                onCreateCampaign(draftName);
              }
            }}
          >
            {t`Create the campaign`}
          </Button>
        </StyledCreateRow>

        {!isNameUsable && (
          <HermesCampaignNote>
            {t`Give the campaign a name to create it.`}
          </HermesCampaignNote>
        )}

        {!isDefined(onCreateCampaign) && (
          <HermesCampaignNote>
            {t`This screen has nothing wired to create a campaign, so the control does nothing.`}
          </HermesCampaignNote>
        )}

        {isCreating && (
          <StyledStatus aria-live="polite">
            <Loader />
            {t`Creating the draft…`}
          </StyledStatus>
        )}

        {isDefined(createFailure) && !isCreateUnconfirmed && (
          <>
            <Banner
              role="alert"
              status="error"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`The campaign was not created.`}
            </Banner>
            <HermesCampaignReason
              reasonCode={createFailure.reasonCode}
              reason={createFailure.reason}
              fallback={t`The server gave no reason.`}
            />
          </>
        )}

        {isCreateUnconfirmed && (
          <>
            <Banner
              role="alert"
              status="warning"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`The outcome of creating the campaign is not known.`}
            </Banner>
            <HermesCampaignNote>
              {t`It may already be in the list below. Creating is shut until you re-read the list, because pressing again on a guess could leave you with two.`}
            </HermesCampaignNote>
            <HermesCampaignNote>
              {t`If it was not created, the next attempt reuses the same identifier, so it cannot produce a second campaign.`}
            </HermesCampaignNote>
            <Button
              variant="outline"
              size="sm"
              loading={isReconcilingCreation}
              disabled={
                !isDefined(onRecheckAfterUncertainCreation) ||
                isReconcilingCreation
              }
              focusableWhenDisabled
              onClick={() => onRecheckAfterUncertainCreation?.()}
            >
              {t`Check whether it was created`}
            </Button>
          </>
        )}

        {isReconcilingCreation && (
          <StyledStatus aria-busy="true" aria-live="polite">
            <Loader />
            {t`Looking the campaign up by its identifier…`}
          </StyledStatus>
        )}

        {/* A reconciled answer, not a guess: the campaign was looked up by
            its own id and is not there. Creating reopens, and the next
            attempt replays the same id. */}
        {isCreationReconciledAbsent && (
          <>
            <Banner
              status="info"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`Checked: this campaign was not created.`}
            </Banner>
            <HermesCampaignNote>
              {t`You can create it again. It will reuse the same identifier, so there is no risk of ending up with two.`}
            </HermesCampaignNote>
          </>
        )}

        {isDefined(reconcileFailure) && (
          <>
            <Banner
              role="alert"
              status="warning"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`The check itself failed, so it is still unknown whether the campaign was created.`}
            </Banner>
            <HermesCampaignReason
              reasonCode={reconcileFailure.reasonCode}
              reason={reconcileFailure.reason}
              fallback={t`The server gave no reason.`}
            />
            <HermesCampaignNote>
              {t`Creating stays shut: a failed check is not permission to press again. Try the check again once the connection is back.`}
            </HermesCampaignNote>
          </>
        )}
      </Section.Root>

      <Section.Root>
        <HermesCampaignLoadView
          load={campaignsLoad}
          emptyTitle={t`No campaign yet`}
          emptyDescription={t`Campaigns, audiences and sender identities are partitioned by operating company. Create the first one above.`}
          notConfiguredTitle={t`Campaigns are not enabled`}
          notConfiguredDescription={t`The native campaign engine is not enabled on this workspace, so there is nothing to list and nothing can be sent.`}
          failedTitle={t`The campaigns could not be read`}
          onRetry={onRetry}
        >
          <StyledList>
            {(campaignsLoad.kind === 'ready' ? campaignsLoad.value : []).map(
              (entry) => {
                const presentation = isDefined(entry.state)
                  ? STATE_PRESENTATION[entry.state]
                  : null;
                const StateIcon = presentation?.Icon;

                return (
                  <li key={entry.id}>
                    <StyledRowButton
                      type="button"
                      disabled={!isDefined(onOpenCampaign)}
                      onClick={() => onOpenCampaign?.(entry.id)}
                    >
                      <StyledRowHeader>
                        <StyledRowName>
                          {isNonEmptyString(entry.name?.trim())
                            ? entry.name
                            : t`Untitled campaign`}
                        </StyledRowName>

                        {isDefined(presentation) && isDefined(entry.state) ? (
                          <Tag
                            color={presentation.color}
                            variant={presentation.variant}
                            borderStyle="solid"
                            startIcon={
                              isDefined(StateIcon) ? <StateIcon /> : undefined
                            }
                            truncate={false}
                          >
                            {stateLabels[entry.state]}
                          </Tag>
                        ) : (
                          // A status outside the contract is named, not
                          // rounded into one of the five states.
                          <Tag
                            color="gray"
                            variant="outline"
                            borderStyle="solid"
                            truncate={false}
                          >
                            {isNonEmptyString(entry.unknownStatus)
                              ? t`Unknown state: ${entry.unknownStatus}`
                              : t`State not published`}
                          </Tag>
                        )}
                      </StyledRowHeader>

                      <StyledRowDetail>
                        {isNonEmptyString(entry.subject)
                          ? entry.subject
                          : t`No subject recorded yet.`}
                      </StyledRowDetail>

                      <StyledRowDetail>
                        {isNonEmptyString(entry.sentAt)
                          ? t`Sent on ${entry.sentAt}.`
                          : isNonEmptyString(entry.scheduledAt)
                            ? t`Scheduled for ${entry.scheduledAt}.`
                            : t`Nothing scheduled and nothing sent.`}
                      </StyledRowDetail>

                      <StyledRowDetail>
                        {/* A figure the server did not publish is unknown,
                            never zero: an unpublished count is not proof
                            that nothing was sent. */}
                        {isDefined(entry.sentCount)
                          ? t`${i18n.number(entry.sentCount)} accepted by the transport, which is a handover and not a delivery.`
                          : t`The number accepted by the transport is unknown.`}
                      </StyledRowDetail>
                    </StyledRowButton>
                  </li>
                );
              },
            )}
          </StyledList>

          {!isDefined(onOpenCampaign) && (
            <HermesCampaignNote>
              {t`This screen has nothing wired to open a campaign, so the rows do nothing.`}
            </HermesCampaignNote>
          )}

          {isDefined(totalCount) &&
            campaignsLoad.kind === 'ready' &&
            totalCount > campaignsLoad.value.length && (
              <HermesCampaignNote>
                {t`${i18n.number(campaignsLoad.value.length)} of ${i18n.number(totalCount)} campaigns shown.`}
              </HermesCampaignNote>
            )}

          {/* Without this the list stopped at its page size with no way
              past it, so the rest of the campaigns were unreachable. */}
          {hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              loading={isLoadingMore}
              disabled={!isDefined(onLoadMore) || isLoadingMore}
              focusableWhenDisabled
              onClick={() => onLoadMore?.()}
            >
              {t`Show more campaigns`}
            </Button>
          )}

          {hasNextPage && !isDefined(onLoadMore) && (
            <HermesCampaignNote>
              {t`This screen has nothing wired to read the next page, so the control does nothing.`}
            </HermesCampaignNote>
          )}

          <HermesCampaignNote>
            <Trans>
              Opening a campaign shows what the server holds for it. Nothing in
              this list sends anything.
            </Trans>
          </HermesCampaignNote>
        </HermesCampaignLoadView>
      </Section.Root>
    </StyledLayout>
  );
};
