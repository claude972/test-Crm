import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconAlertTriangle } from 'kovaa-lab-ui/icon';
import { Banner, Loader } from 'kovaa-lab-ui/primitives/feedback';
import { Button, Field, Select } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import { type HermesCampaignAudienceOption } from '@/hermes-campaigns-ui/types/HermesCampaignAudienceOption';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

// A div rather than a p: this line can contain the loader, which renders a
// div, and a div inside a p is invalid DOM. It is a status line, not prose.
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

export type HermesCampaignAudiencePickerProps = {
  // The lists this company holds. Five answers, told apart: a company with no
  // list at all is not a failed read.
  audiencesLoad: HermesCampaignLoad<HermesCampaignAudienceOption[]>;
  onRetryAudiences?: () => void;
  selectedListId: string | null;
  onSelectList?: (listId: string) => void;
  listSaveState: HermesCampaignSaveState;
  // More lists than this page holds. Without a way past the page size the
  // remaining audiences cannot be selected at all.
  hasMoreAudiences: boolean;
  isLoadingMoreAudiences: boolean;
  onLoadMoreAudiences?: () => void;

  // The unsubscribe topic the campaign is sent under. Separate from the list:
  // one says who, the other says what they may opt out of.
  topics: HermesCampaignAudienceOption[];
  selectedTopicId: string | null;
  onSelectTopic?: (topicId: string) => void;
  topicSaveState: HermesCampaignSaveState;

  // Read-only once the campaign is no longer a draft: changing the audience
  // of a campaign on its way would describe recipients nobody will reach.
  isEditable: boolean;
};

const StatusLine = ({
  saveState,
  savingLabel,
  savedLabel,
  refusedLabel,
  unconfirmedLabel,
}: {
  saveState: HermesCampaignSaveState;
  savingLabel: string;
  savedLabel: string;
  refusedLabel: string;
  unconfirmedLabel: string;
}) => (
  <StyledStatus aria-live="polite">
    {saveState.kind === 'saving' && (
      <>
        <Loader />
        {savingLabel}
      </>
    )}
    {saveState.kind === 'saved' && savedLabel}
    {saveState.kind === 'failed' && refusedLabel}
    {saveState.kind === 'unconfirmed' && unconfirmedLabel}
  </StyledStatus>
);

// Giving a campaign its audience, and the topic it can be opted out of.
//
// This exists because a campaign created from this screen had no way to ever
// get an audience: nothing offered a list, and the recording path did not
// even accept `listId`. A draft stayed empty for life, and a link telling the
// operator to configure it elsewhere would not have closed the journey.
//
// Choosing a list records its id on the campaign and nothing more. The server
// re-resolves the audience from that list under its own rights and its own
// suppressions, so no count here is computed by the interface — the figures
// come from the server's own answer, in the section below.
export const HermesCampaignAudiencePicker = ({
  audiencesLoad,
  onRetryAudiences,
  selectedListId,
  onSelectList,
  listSaveState,
  hasMoreAudiences,
  isLoadingMoreAudiences,
  onLoadMoreAudiences,
  topics,
  selectedTopicId,
  onSelectTopic,
  topicSaveState,
  isEditable,
}: HermesCampaignAudiencePickerProps) => {
  const { t } = useLingui();

  const audiences = audiencesLoad.kind === 'ready' ? audiencesLoad.value : [];

  const toItems = (options: HermesCampaignAudienceOption[]) =>
    options.map((option) => ({
      value: option.id,
      label: isNonEmptyString(option.name)
        ? option.name
        : // Named for what it is rather than shown as an empty row.
          t`List without a published name`,
    }));

  const audienceItems = useMemo(() => toItems(audiences), [audiences, t]);
  const topicItems = useMemo(() => toItems(topics), [topics, t]);

  const isListPickable =
    isEditable && isDefined(onSelectList) && audienceItems.length > 0;

  return (
    <StyledLayout>
      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Audience list`}</Field.Label>
        <Select.Root
          items={audienceItems}
          value={selectedListId ?? ''}
          disabled={!isListPickable}
          onValueChange={(value) => {
            if (typeof value === 'string' && isDefined(onSelectList)) {
              onSelectList(value);
            }
          }}
        >
          <Select.Trigger size="md" aria-label={t`Audience list`}>
            <Select.Value placeholder={t`Pick an audience list`} />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={8} align="start">
              <Select.Popup>
                {audienceItems.map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Field.Description>
          {!isDefined(selectedListId)
            ? t`This campaign has no audience list yet, so it has no recipients at all. Choose one here.`
            : t`The server re-resolves who is reachable from this list, applying its own rights and the standing objections.`}
        </Field.Description>
      </Field.Root>

      {audiencesLoad.kind === 'loading' && (
        <StyledStatus aria-busy="true" aria-live="polite">
          <Loader />
          {t`Reading the audience lists…`}
        </StyledStatus>
      )}

      {audiencesLoad.kind === 'empty' && (
        <HermesCampaignNote>
          {t`This company holds no audience list yet. One is built from qualified records, in the Hermès reception.`}
        </HermesCampaignNote>
      )}

      {audiencesLoad.kind === 'not-configured' && (
        <HermesCampaignNote>
          {t`Audience lists are not available: the native campaign engine is not enabled on this workspace.`}
        </HermesCampaignNote>
      )}

      {audiencesLoad.kind === 'failed' && (
        <>
          <Banner
            role="alert"
            status="error"
            variant="soft"
            icon={<IconAlertTriangle aria-hidden="true" />}
          >
            {t`The audience lists could not be read.`}
          </Banner>
          <HermesCampaignReason
            reasonCode={audiencesLoad.reasonCode}
            reason={audiencesLoad.reason}
            fallback={t`The server gave no reason.`}
          />
          {isDefined(onRetryAudiences) && (
            <HermesCampaignNote>
              {t`A failed read is not an empty company: nothing is shown rather than an empty list invented.`}
            </HermesCampaignNote>
          )}
        </>
      )}

      {hasMoreAudiences && (
        <>
          <Button
            variant="outline"
            size="sm"
            loading={isLoadingMoreAudiences}
            disabled={
              !isDefined(onLoadMoreAudiences) || isLoadingMoreAudiences
            }
            focusableWhenDisabled
            onClick={() => onLoadMoreAudiences?.()}
          >
            {t`Show more audience lists`}
          </Button>
          <HermesCampaignNote>
            {t`Not every list this company holds is shown yet. Read the rest before concluding the one you want is missing.`}
          </HermesCampaignNote>
        </>
      )}

      <StatusLine
        saveState={listSaveState}
        savingLabel={t`Recording the audience list…`}
        savedLabel={t`Audience list recorded on the campaign. It will still be here after a reload.`}
        refusedLabel={t`The server refused to record this audience list. The campaign still holds the previous one.`}
        unconfirmedLabel={t`The outcome of recording this audience list is not known. Reload the campaign to see which one it holds; nothing is retried on its own.`}
      />

      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Unsubscribe topic`}</Field.Label>
        <Select.Root
          items={topicItems}
          value={selectedTopicId ?? ''}
          disabled={
            !isEditable || !isDefined(onSelectTopic) || topicItems.length === 0
          }
          onValueChange={(value) => {
            if (typeof value === 'string' && isDefined(onSelectTopic)) {
              onSelectTopic(value);
            }
          }}
        >
          <Select.Trigger size="md" aria-label={t`Unsubscribe topic`}>
            <Select.Value placeholder={t`Pick an unsubscribe topic`} />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={8} align="start">
              <Select.Popup>
                {topicItems.map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Field.Description>
          {topicItems.length === 0
            ? t`This company has no unsubscribe topic yet.`
            : t`What a recipient opts out of when they unsubscribe. A standing objection is kept by the server and is not undone here.`}
        </Field.Description>
      </Field.Root>

      <StatusLine
        saveState={topicSaveState}
        savingLabel={t`Recording the unsubscribe topic…`}
        savedLabel={t`Unsubscribe topic recorded on the campaign.`}
        refusedLabel={t`The server refused to record this unsubscribe topic. The campaign still holds the previous one.`}
        unconfirmedLabel={t`The outcome of recording this unsubscribe topic is not known. Reload the campaign before changing it again.`}
      />

      {!isEditable && (
        <HermesCampaignNote>
          {t`The audience is read-only: this campaign is no longer a draft.`}
        </HermesCampaignNote>
      )}

      <HermesCampaignNote>
        <Trans>
          Choosing a list records which list this campaign uses. It does not
          decide who will be written to: the server resolves that again at
          departure, and the standing objections apply then.
        </Trans>
      </HermesCampaignNote>

      <HermesCampaignNote>
        <Trans>
          A list can resolve to fewer recipients than it holds. That is not a
          discrepancy: the server keeps only rows whose professional purpose
          and company context were recorded at qualification, and sets the
          rest aside. The figures and the reasons below are the server's own,
          and nothing here widens the campaign to records it excluded.
        </Trans>
      </HermesCampaignNote>
    </StyledLayout>
  );
};
