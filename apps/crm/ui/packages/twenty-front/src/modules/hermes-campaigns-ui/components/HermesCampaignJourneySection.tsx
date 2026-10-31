import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
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
import { type HermesCampaignPreviewRecipient } from '@/hermes-campaigns-ui/types/HermesCampaignPreviewRecipient';
import { type HermesSenderIdentityAuthorization } from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';
import { readCampaignCapability } from '@/hermes-campaigns-ui/utils/readCampaignCapability';
import { validateCampaignSchedule } from '@/hermes-campaigns-ui/utils/validateCampaignSchedule';
import { validateTestDestination } from '@/hermes-campaigns-ui/utils/validateTestDestination';

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
  // True once an emission ended with no known result. Every emitting step is
  // then shut: a message may already be in flight, so a second press could
  // duplicate it. The campaign has to be re-read first.
  hasUncertainEmission: boolean;

  // Who the preview is rendered for. Chosen explicitly: a preview of
  // "somebody" would not tell the operator what any actual person receives.
  previewRecipients: HermesCampaignPreviewRecipient[];
  selectedPreviewRecipientId: string | null;
  onSelectPreviewRecipient?: (recipientId: string) => void;

  // Where the test message really goes. The operator types it, and there is
  // no default: a destination nobody chose is how a test reaches a prospect.
  testDestination: string;
  onTestDestinationChange: (destination: string) => void;

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
  hasUncertainEmission,
  previewRecipients,
  selectedPreviewRecipientId,
  onSelectPreviewRecipient,
  testDestination,
  onTestDestinationChange,
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

  // Only the steps that have a published capability behind them. Recording
  // the content or the sender is not one of them: it emits nothing and is
  // gated by the campaign being a draft, not by a send capability.
  const permissionFor = (
    name: Exclude<HermesCampaignActionName, 'saveContent' | 'saveSender'>,
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

  // Shuts an emitting step after an emission whose result is unknown. This
  // overrides a permission the server granted, which is the one direction the
  // interface is allowed to refuse in: never more permissive than the server,
  // sometimes stricter.
  const emissionPermission = (
    permission: HermesCampaignPermission,
  ): HermesCampaignPermission =>
    hasUncertainEmission
      ? {
          kind: 'refused',
          origin: 'client',
          reasonCode: 'PREVIOUS_EMISSION_OUTCOME_UNKNOWN',
          reason: t`A previous emission ended without a known result. Reload the campaign and check what actually left before sending anything again.`,
        }
      : permission;

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

  // A recipient with neither a name nor an address is still offered, named by
  // what it is rather than dropped: a silently shorter list would misstate
  // the audience.
  const previewRecipientItems = useMemo(
    () =>
      previewRecipients.map((recipient) => ({
        value: recipient.id,
        label: isNonEmptyString(recipient.label)
          ? isNonEmptyString(recipient.address)
            ? `${recipient.label} · ${recipient.address}`
            : recipient.label
          : isNonEmptyString(recipient.address)
            ? recipient.address
            : t`Recipient without a readable name or address`,
      })),
    [previewRecipients, t],
  );

  const isTestDestinationUsable = useMemo(
    () => validateTestDestination(testDestination).usable,
    [testDestination],
  );

  const recipientsLabel = isDefined(retainedCount)
    ? t`${i18n.number(retainedCount)} retained recipients, as the server counted them.`
    : t`The number of retained recipients is unknown, so the reach of this send is unknown.`;

  const actionLabels: Record<HermesCampaignActionName, string> = {
    preview: t`Render a recipient preview`,
    testSynthetic: t`Send the test to this address`,
    schedule: t`Schedule the campaign`,
    cancelSchedule: t`Cancel the schedule`,
    send: t`Send the campaign now`,
    saveContent: t`Record the content`,
    saveSender: t`Record the sender`,
  };

  const outcomeLabels: Record<HermesCampaignActionName, string> = {
    preview: t`The preview was rendered.`,
    // Accepted by the server, which is a handover and not a delivery, and to
    // the typed address — no staging restriction is claimed, because none is
    // applied.
    testSynthetic: t`The server accepted the test message for the address you typed.`,
    schedule: t`The server recorded the schedule.`,
    cancelSchedule: t`The server cancelled the still-avoidable departures.`,
    send: t`The server accepted the send.`,
    saveContent: t`The content was recorded on the campaign.`,
    saveSender: t`The sender was recorded on the campaign.`,
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Journey`}
        description={t`A preview emits nothing. A test really sends one message, to the address you type and to no other. A send is a send.`}
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

        {/* The dangerous one: the call left and nobody knows what it did. It
            is reported as neither a success nor a refusal, and no retry is
            offered — the engine quarantines such a result server side and
            never releases it on its own. */}
        {outcome?.kind === 'unconfirmed' && (
          <>
            <Banner
              role="alert"
              status="warning"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`${actionLabels[outcome.action]} — outcome unknown.`}
            </Banner>
            <HermesCampaignReason
              reasonCode={outcome.reasonCode}
              reason={outcome.reason}
              fallback={t`The server gave no reason.`}
            />
            <HermesCampaignNote>
              <Trans>
                It may have happened, in whole or in part. Nothing is retried
                automatically and no step is offered again: reload the campaign
                and read what actually left before deciding. Pressing again now
                could send the same message twice.
              </Trans>
            </HermesCampaignNote>
          </>
        )}

        <StyledSteps>
          {/* The preview is asked for one named recipient. The picker stays
              on screen even while the render step is closed, so the operator
              can still see which recipients the campaign resolved. */}
          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Recipient to preview`}</Field.Label>
            <Select.Root
              items={previewRecipientItems}
              value={selectedPreviewRecipientId ?? ''}
              disabled={previewRecipientItems.length === 0}
              onValueChange={(value) => {
                if (
                  typeof value === 'string' &&
                  isDefined(onSelectPreviewRecipient)
                ) {
                  onSelectPreviewRecipient(value);
                }
              }}
            >
              <Select.Trigger size="md" aria-label={t`Recipient to preview`}>
                <Select.Value placeholder={t`Pick a recipient`} />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner sideOffset={8} align="start">
                  <Select.Popup>
                    {previewRecipientItems.map((item) => (
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
              {previewRecipientItems.length === 0
                ? t`No recipient was read for this campaign, so there is nobody to render a preview for.`
                : t`The preview resolves the variables against this recipient's record.`}
            </Field.Description>
          </Field.Root>

          <HermesCampaignActionButton
            id="hermes-campaign-action-preview"
            label={actionLabels.preview}
            effect={t`Renders the subject and the message for the chosen recipient, in this screen. No transport is contacted and nobody receives anything.`}
            emissionKind="none"
            permission={
              // No recipient chosen, nothing to render for. Said as this
              // screen's own requirement rather than left to look like a
              // missing callback or a refusal by the server.
              permissionFor('preview').kind === 'allowed' &&
              !isDefined(selectedPreviewRecipientId)
                ? {
                    kind: 'refused',
                    origin: 'client',
                    reasonCode: null,
                    reason: t`Choose the recipient to preview first.`,
                  }
                : permissionFor('preview')
            }
            isRunning={isRunning('preview')}
            onActivate={
              isDefined(selectedPreviewRecipientId) ? onPreview : undefined
            }
          />

          {/* The test destination, typed by the operator. There is no
              default and no implicit fallback to the signed-in user: the
              server accepts any address here, so the field is the guard. */}
          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Test destination`}</Field.Label>
            <Input
              type="email"
              value={testDestination}
              inputMode="email"
              autoComplete="off"
              placeholder={t`Type the mailbox that should receive the test`}
              onChange={(event) => onTestDestinationChange(event.target.value)}
            />
            <Field.Description>
              {t`One real message goes to this address. The server applies no staging restriction to it, so never type a prospect's address here.`}
            </Field.Description>
          </Field.Root>

          <HermesCampaignActionButton
            id="hermes-campaign-action-test"
            label={actionLabels.testSynthetic}
            effect={t`Really sends one message, to the address above and to nobody else. It is not a preview, and it does not send the campaign.`}
            emissionKind="typed-destination"
            permission={emissionPermission(
              // An address that cannot be one is refused here rather than
              // sent for the server to reject.
              permissionFor('testSynthetic').kind === 'allowed' &&
                !isTestDestinationUsable
                ? {
                    kind: 'refused',
                    origin: 'client',
                    reasonCode: null,
                    reason: t`Type the destination of the test first.`,
                  }
                : permissionFor('testSynthetic'),
            )}
            isRunning={isRunning('testSynthetic')}
            onActivate={
              isTestDestinationUsable && !hasUncertainEmission
                ? onSendSyntheticTest
                : undefined
            }
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
            permission={emissionPermission(
              sendPermission.kind === 'allowed' && !isSendConfirmed
                ? {
                    kind: 'refused',
                    // The confirmation is this screen's own requirement, not
                    // something the server withheld.
                    origin: 'client',
                    reasonCode: null,
                    reason: t`Confirm below first. A send is not undone by a cancellation.`,
                  }
                : sendPermission,
            )}
            isRunning={isRunning('send')}
            onActivate={
              isSendConfirmed && !hasUncertainEmission ? onSend : undefined
            }
          >
            <HermesCampaignNote>{recipientsLabel}</HermesCampaignNote>
          </HermesCampaignActionButton>

          <StyledConfirmation>
            <Checkbox
              checked={isSendConfirmed}
              disabled={
                sendPermission.kind !== 'allowed' || hasUncertainEmission
              }
              onCheckedChange={(checked) => setIsSendConfirmed(checked)}
            >
              {t`I am sending this campaign to the retained recipients.`}
            </Checkbox>
          </StyledConfirmation>
        </StyledSteps>
      </StyledLayout>
    </Section.Root>
  );
};
