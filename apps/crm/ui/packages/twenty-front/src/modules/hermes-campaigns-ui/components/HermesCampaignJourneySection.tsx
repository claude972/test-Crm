import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconAlertTriangle, IconCheck } from 'kovaa-lab-ui/icon';
import { Banner } from 'kovaa-lab-ui/primitives/feedback';
import { Checkbox, Field, Input, Select } from 'kovaa-lab-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignActionButton } from '@/hermes-campaigns-ui/components/HermesCampaignActionButton';
import { HermesCampaignIssueList } from '@/hermes-campaigns-ui/components/HermesCampaignIssueList';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import {
  type HermesCampaignCapabilities,
  type HermesCampaignPermission,
} from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import {
  type HermesCampaignActionName,
  type HermesCampaignActionOutcome,
  type HermesCampaignSchedule,
  type HermesCampaignState,
} from '@/hermes-campaigns-ui/types/HermesCampaignJourney';
import { type HermesSenderIdentityAuthorization } from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';
import { readCampaignCapability } from '@/hermes-campaigns-ui/utils/readCampaignCapability';
import { validateCampaignSchedule } from '@/hermes-campaigns-ui/utils/validateCampaignSchedule';

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
`;

const StyledSteps = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledConfirmation = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledScheduleFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

type HermesCampaignJourneySectionProps = {
  // Null when the capabilities could not be read. Every step is then shut.
  capabilities: HermesCampaignCapabilities | null;
  identityAuthorization: HermesSenderIdentityAuthorization | null;
  campaignState: HermesCampaignState;
  scheduleDraft: HermesCampaignSchedule;
  onScheduleDraftChange: (draft: HermesCampaignSchedule) => void;
  // The zones the workspace offers. None is guessed from the browser: a
  // campaign departs at a moment somebody chose.
  timeZones: string[];
  // The moment already recorded on the server, when there is one.
  scheduledAt: HermesCampaignSchedule | null;
  // The recipients a send would reach, as the server counted them. Null when
  // unknown, and an unknown count is said out loud.
  retainedCount: number | null;
  outcome: HermesCampaignActionOutcome | null;
  onPreview?: () => void;
  onSendSyntheticTest?: () => void;
  onSchedule?: (schedule: HermesCampaignSchedule) => void;
  onCancelSchedule?: () => void;
  onSend?: () => void;
};

// The five steps, in the order they are taken, each saying what it really
// does to the outside world.
export const HermesCampaignJourneySection = ({
  capabilities,
  identityAuthorization,
  campaignState,
  scheduleDraft,
  onScheduleDraftChange,
  timeZones,
  scheduledAt,
  retainedCount,
  outcome,
  onPreview,
  onSendSyntheticTest,
  onSchedule,
  onCancelSchedule,
  onSend,
}: HermesCampaignJourneySectionProps) => {
  const { t, i18n } = useLingui();

  // A send is confirmed in the page, by an act distinct from pressing the
  // button, and the confirmation names what will happen.
  const [isSendConfirmed, setIsSendConfirmed] = useState(false);

  const scheduleValidation = useMemo(
    () =>
      validateCampaignSchedule({
        date: scheduleDraft.date,
        time: scheduleDraft.time,
        timeZone: scheduleDraft.timeZone,
      }),
    [scheduleDraft.date, scheduleDraft.time, scheduleDraft.timeZone],
  );

  const permissionFor = (
    name: HermesCampaignActionName,
  ): HermesCampaignPermission => {
    const capabilityName = name === 'cancelSchedule' ? 'cancel' : name;

    return readCampaignCapability({
      name: capabilityName,
      capability: capabilities?.[capabilityName] ?? null,
      identityAuthorization,
    });
  };

  const isRunning = (name: HermesCampaignActionName) =>
    outcome?.kind === 'running' && outcome.action === name;

  const isEditable = campaignState === 'draft' || campaignState === 'scheduled';

  const schedulePermission = permissionFor('schedule');
  const sendPermission = permissionFor('send');

  const timeZoneItems = timeZones.map((timeZone) => ({
    value: timeZone,
    label: timeZone,
  }));

  const scheduledLabel = isDefined(scheduledAt)
    ? t`Scheduled for ${scheduledAt.date} at ${scheduledAt.time} (${scheduledAt.timeZone}).`
    : t`Nothing is scheduled.`;

  const recipientsLabel = isDefined(retainedCount)
    ? t`${i18n.number(retainedCount)} retained recipients, as the server counted them.`
    : t`The number of retained recipients is unknown, so the reach of this send is unknown.`;

  const actionLabels: Record<HermesCampaignActionName, string> = {
    preview: t`Render a recipient preview`,
    testSynthetic: t`Send a synthetic test`,
    schedule: t`Schedule the campaign`,
    cancelSchedule: t`Cancel the schedule`,
    send: t`Send the campaign now`,
  };

  const outcomeLabels: Record<HermesCampaignActionName, string> = {
    preview: t`The preview was rendered.`,
    testSynthetic: t`The server accepted the synthetic test for its staging destinations.`,
    schedule: t`The server recorded the schedule.`,
    cancelSchedule: t`The server cancelled the still-avoidable departures.`,
    send: t`The server accepted the send.`,
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Journey`}
        description={t`A preview emits nothing. A test is a real emission restricted to staging destinations. A send is a send.`}
      />

      <StyledLayout>
        {outcome?.kind === 'succeeded' && (
          <Banner
            status="success"
            variant="soft"
            icon={<IconCheck aria-hidden="true" />}
          >
            {/* What the server did, never more: accepted is not delivered. */}
            {outcome.detail ?? outcomeLabels[outcome.action]}
          </Banner>
        )}

        {outcome?.kind === 'failed' && (
          <>
            <Banner
              role="alert"
              status="error"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`${actionLabels[outcome.action]} — refused.`}
            </Banner>
            <HermesCampaignReason
              reasonCode={outcome.reasonCode}
              reason={outcome.reason}
              fallback={t`The server gave no reason. Nothing happened, and nothing is assumed to have happened.`}
            />
          </>
        )}

        <StyledSteps>
          <HermesCampaignActionButton
            id="hermes-campaign-action-preview"
            label={actionLabels.preview}
            effect={t`Renders the subject and the message for one recipient, in this screen. No transport is contacted and nobody receives anything.`}
            emissionKind="none"
            permission={permissionFor('preview')}
            isRunning={isRunning('preview')}
            onActivate={onPreview}
          />

          <HermesCampaignActionButton
            id="hermes-campaign-action-test"
            label={actionLabels.testSynthetic}
            effect={t`Really sends one message, which the server restricts to staging destinations. It never reaches a prospect, and it is not a preview.`}
            emissionKind="staging-destinations-only"
            permission={permissionFor('testSynthetic')}
            isRunning={isRunning('testSynthetic')}
            onActivate={onSendSyntheticTest}
          />

          <HermesCampaignActionButton
            id="hermes-campaign-action-schedule"
            label={actionLabels.schedule}
            effect={t`Records the moment below. Scheduling does not send: the identity, the capability and the exclusions are read again at departure.`}
            emissionKind="none"
            permission={
              // A moment that does not parse cannot be recorded, whatever the
              // server allows.
              schedulePermission.kind === 'allowed' &&
              !isDefined(scheduleValidation.schedule)
                ? {
                    kind: 'refused',
                    origin: 'server',
                    reasonCode: null,
                    reason: t`The moment below is incomplete.`,
                  }
                : schedulePermission
            }
            isRunning={isRunning('schedule')}
            onActivate={
              isDefined(onSchedule) && isDefined(scheduleValidation.schedule)
                ? () => {
                    const schedule = scheduleValidation.schedule;

                    if (isDefined(schedule)) {
                      onSchedule(schedule);
                    }
                  }
                : undefined
            }
          >
            <HermesCampaignNote>{scheduledLabel}</HermesCampaignNote>
          </HermesCampaignActionButton>

          <StyledScheduleFields>
            <Field.Root render={<StyledField />}>
              <Field.Label>{t`Date`}</Field.Label>
              <Input
                type="date"
                value={scheduleDraft.date}
                disabled={!isEditable}
                onChange={(event) =>
                  onScheduleDraftChange({
                    ...scheduleDraft,
                    date: event.target.value,
                  })
                }
              />
            </Field.Root>

            <Field.Root render={<StyledField />}>
              <Field.Label>{t`Time`}</Field.Label>
              <Input
                type="time"
                value={scheduleDraft.time}
                disabled={!isEditable}
                onChange={(event) =>
                  onScheduleDraftChange({
                    ...scheduleDraft,
                    time: event.target.value,
                  })
                }
              />
            </Field.Root>

            <Field.Root render={<StyledField />}>
              <Field.Label>{t`Time zone`}</Field.Label>
              <Select.Root
                items={timeZoneItems}
                value={scheduleDraft.timeZone}
                disabled={!isEditable}
                onValueChange={(value) => {
                  if (typeof value === 'string') {
                    onScheduleDraftChange({
                      ...scheduleDraft,
                      timeZone: value,
                    });
                  }
                }}
              >
                <Select.Trigger size="md" aria-label={t`Time zone`}>
                  <Select.Value placeholder={t`Pick a time zone`} />
                  <Select.Icon />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={8} align="start">
                    <Select.Popup>
                      {timeZoneItems.map((item) => (
                        <Select.Item key={item.value} value={item.value}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
              <HermesCampaignNote>
                {t`A wall-clock time without a zone is not a moment.`}
              </HermesCampaignNote>
            </Field.Root>
          </StyledScheduleFields>

          <HermesCampaignIssueList issues={scheduleValidation.issues} />

          <HermesCampaignActionButton
            id="hermes-campaign-action-cancel"
            label={actionLabels.cancelSchedule}
            effect={t`Withdraws the departures that are still avoidable. It cannot recall a message the SMTP server has already accepted.`}
            emissionKind="none"
            permission={permissionFor('cancelSchedule')}
            isRunning={isRunning('cancelSchedule')}
            onActivate={onCancelSchedule}
          />

          <HermesCampaignActionButton
            id="hermes-campaign-action-send"
            label={actionLabels.send}
            effect={t`Puts the campaign on the transport for the retained recipients. This one reaches people.`}
            emissionKind="recipients"
            permission={
              sendPermission.kind === 'allowed' && !isSendConfirmed
                ? {
                    kind: 'refused',
                    origin: 'server',
                    reasonCode: null,
                    reason: t`Confirm below first. A send is not undone by a cancellation.`,
                  }
                : sendPermission
            }
            isRunning={isRunning('send')}
            onActivate={isSendConfirmed ? onSend : undefined}
          >
            <HermesCampaignNote>{recipientsLabel}</HermesCampaignNote>
          </HermesCampaignActionButton>

          <StyledConfirmation>
            <Checkbox
              checked={isSendConfirmed}
              disabled={sendPermission.kind !== 'allowed'}
              onCheckedChange={(checked) => setIsSendConfirmed(checked)}
            >
              {t`I am sending this campaign to the retained recipients.`}
            </Checkbox>
          </StyledConfirmation>
        </StyledSteps>

        <HermesCampaignNote>
          <Trans>
            Every step that is not permitted stays shut with its reason in this
            page, next to the control, and the control keeps its place in the
            tab order so the reason can be read without a mouse.
          </Trans>
        </HermesCampaignNote>
      </StyledLayout>
    </Section.Root>
  );
};
