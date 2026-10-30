import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRobot, IconUser } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { type MessagingInboxBotModeControl as BotModeControl } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';
import { useMessagingInboxBotPolicy } from '@/messaging-inbox/hooks/useMessagingInboxBotPolicy';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type MessagingInboxBotModeControlProps = {
  conversationId: string;
  // What the conversation itself reported. The control never overwrites this
  // with the mode that was requested.
  reportedMode: string | null;
  control: BotModeControl;
};

export const MessagingInboxBotModeControl = ({
  conversationId,
  reportedMode,
  control,
}: MessagingInboxBotModeControlProps) => {
  const { t } = useLingui();

  // The V3 policy, when the deployment publishes it. It is authoritative over
  // the per-conversation mode below, because it already accounts for the
  // company and channel policies. A deployment without it keeps the v1
  // rendering untouched rather than losing the control.
  const policy = useMessagingInboxBotPolicy(conversationId);

  const effective =
    policy.read.kind === 'reported' ? policy.read.policy.effectiveMode : null;

  // Offering an automatic reply that the policy will refuse is a button that
  // lies. The company or channel policy caps this conversation, so the
  // decision belongs in Settings, not here.
  const autoIsCapped = effective === 'OFF' || effective === 'ASSISTED';

  // The server's answer wins when there is one; otherwise the conversation's
  // own field. Neither is the button that was pressed.
  const mode =
    control.state.kind === 'settled' ? control.state.mode : reportedMode;

  const isAuto = mode === 'AUTO';
  const isManual = mode === 'MANUAL';

  return (
    <>
      <StyledRow>
        {isAuto ? (
          <Tag
            color="amber"
            variant="outline"
            borderStyle="dashed"
            weight="medium"
            truncate={false}
            startIcon={<IconRobot />}
          >
            {t`Bot may reply once to new messages`}
          </Tag>
        ) : isManual ? (
          <Tag
            color="gray"
            variant="soft"
            weight="medium"
            truncate={false}
            startIcon={<IconUser />}
          >
            {t`Human only`}
          </Tag>
        ) : (
          <Tag
            color="gray"
            variant="outline"
            borderStyle="dashed"
            truncate={false}
          >
            {t`Delegation unknown`}
          </Tag>
        )}

        {/* Taking the conversation back is always offered when it is not
            already manual: a handoff must never depend on knowing the exact
            current mode. */}
        {!isManual && (
          <Button
            variant="outline"
            size="sm"
            loading={control.state.kind === 'requesting'}
            onClick={() => control.setBotMode(conversationId, 'MANUAL')}
          >
            {t`Take over`}
          </Button>
        )}

        {!isAuto && !autoIsCapped && (
          <Button
            variant="outline"
            size="sm"
            loading={control.state.kind === 'requesting'}
            onClick={() => control.setBotMode(conversationId, 'AUTO')}
          >
            {t`Let the bot reply`}
          </Button>
        )}
      </StyledRow>

      {/* The status is why a request did not change the mode. Shown only when
          the server did NOT apply what was asked, so asking for AUTO and
          staying MANUAL reads as an answer rather than as a button that did
          nothing — and a success stays silent.

          MANUAL and ACTIVE are this operation's two successes. READY belongs
          to the draft contract and is never returned here, so testing for it
          made every success print its own status code. */}
      {control.state.kind === 'settled' &&
        control.state.status !== 'MANUAL' &&
        control.state.status !== 'ACTIVE' && (
          <MessagingInboxNote role="status">
            {control.state.status === 'NOT_CONFIGURED'
              ? t`Delegation is not set up, so this conversation stays human only.`
              : control.state.status === 'UNAVAILABLE'
                ? t`Delegation is unavailable, so this conversation stays human only.`
                : t`The server answered: ${control.state.status}`}
          </MessagingInboxNote>
        )}

      {/* Why the automatic reply is not on offer. Said once, in product
          words, instead of leaving a missing button unexplained. */}
      {autoIsCapped && (
        <MessagingInboxNote role="status">
          {effective === 'OFF'
            ? t`The company settings stop the bot on this channel. Replies stay human.`
            : t`The company settings keep the bot assisted: it may draft, and you send.`}
        </MessagingInboxNote>
      )}

      {control.state.kind === 'denied' && (
        <MessagingInboxNote role="alert">
          {t`Not authorised to change delegation.`}
        </MessagingInboxNote>
      )}

      {control.state.kind === 'failed' && (
        <MessagingInboxNote role="alert">
          {isNonEmptyString(control.state.message)
            ? t`Delegation unchanged: ${control.state.message}`
            : t`Delegation unchanged.`}
        </MessagingInboxNote>
      )}
    </>
  );
};
