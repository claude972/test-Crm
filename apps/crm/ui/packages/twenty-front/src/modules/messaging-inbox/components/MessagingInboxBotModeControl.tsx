import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRobot, IconUser } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxBotModeControl as BotModeControl } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';
import { useMessagingInboxBotPolicy } from '@/messaging-inbox/hooks/useMessagingInboxBotPolicy';
import { type MessagingInboxBotMode } from '@/messaging-inbox/types/MessagingInboxBotPolicy';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type MessagingInboxBotModeControlProps = {
  conversationId: string;
  reportedMode: string | null;
  // Kept for the parent's signature. The v1 mutation is deliberately not used:
  // it cannot express OFF and cannot be refused by a company policy, so
  // writing through it would bypass the policy this control exists to honour.
  control: BotModeControl;
};

// The bot on one conversation.
//
// Every write goes through the V3 policy. When the policy cannot be read the
// bot actions are disabled rather than falling back to the old per-conversation
// mutation: that mutation knows nothing of the company or channel policy, so
// using it as a fallback would be a way around OFF.
//
// Replying by hand never depends on any of this.
export const MessagingInboxBotModeControl = ({
  conversationId,
}: MessagingInboxBotModeControlProps) => {
  const { t } = useLingui();

  const policy = useMessagingInboxBotPolicy(conversationId);

  const known = policy.read.kind === 'reported' ? policy.read.policy : null;
  const isBusy = policy.writeState.kind === 'requesting';

  const modeLabel =
    known?.effectiveMode === 'AUTO'
      ? t`Bot replies on its own`
      : known?.effectiveMode === 'ASSISTED'
        ? t`Bot drafts, you send`
        : known?.effectiveMode === 'OFF'
          ? t`Bot stopped`
          : t`Bot mode unknown`;

  // Only the transitions the policy can accept are offered. AUTO is offered
  // only when the server says this conversation may reply on its own, because
  // it is the one transition that needs a delegation we do not yet ask for.
  const choices: { mode: MessagingInboxBotMode; label: string }[] =
    known === null
      ? []
      : [
          { mode: 'INHERIT', label: t`Follow the company` },
          { mode: 'ASSISTED', label: t`Drafts only` },
          { mode: 'OFF', label: t`Stop the bot` },
        ].filter((choice) => choice.mode !== known.localMode);

  return (
    <>
      <StyledRow>
        <Tag
          color={known?.effectiveMode === 'AUTO' ? 'amber' : 'gray'}
          variant={known === null ? 'outline' : 'soft'}
          borderStyle={known === null ? 'dashed' : 'solid'}
          weight="medium"
          truncate={false}
          startIcon={
            known?.effectiveMode === 'AUTO' ? <IconRobot /> : <IconUser />
          }
        >
          {modeLabel}
        </Tag>

        {known !== null && !known.canDraft && (
          <Tag color="gray" variant="soft" truncate={false}>
            {t`No drafts on this conversation`}
          </Tag>
        )}

        {choices.map((choice) => (
          <Button
            key={choice.mode}
            variant="outline"
            size="sm"
            loading={isBusy}
            onClick={() => policy.setMode(choice.mode)}
          >
            {choice.label}
          </Button>
        ))}
      </StyledRow>

      {known === null && (
        <MessagingInboxNote role="status">
          {t`The bot policy could not be read, so it cannot be changed here. Replying by hand still works.`}
        </MessagingInboxNote>
      )}

      {policy.writeState.kind === 'refused' && (
        <MessagingInboxNote role="alert">
          {isNonEmptyString(policy.writeState.message)
            ? t`Change refused: ${policy.writeState.message}`
            : t`Change refused.`}
        </MessagingInboxNote>
      )}

      {policy.writeState.kind === 'failed' && (
        <MessagingInboxNote role="alert">
          {isNonEmptyString(policy.writeState.message)
            ? t`Policy unchanged: ${policy.writeState.message}`
            : t`Policy unchanged.`}
        </MessagingInboxNote>
      )}
    </>
  );
};
