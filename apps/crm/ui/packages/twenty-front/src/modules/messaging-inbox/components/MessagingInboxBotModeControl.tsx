import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRobot, IconUser } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxAutoDelegationOffer } from '@/messaging-inbox/components/MessagingInboxAutoDelegationOffer';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxBotModeControl as BotModeControl } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';
import { useMessagingInboxBotPolicy } from '@/messaging-inbox/hooks/useMessagingInboxBotPolicy';
import { type MessagingInboxBotMode } from '@/messaging-inbox/types/MessagingInboxBotPolicy';
import { type MessagingInboxPolicyRefusalCode } from '@/messaging-inbox/utils/readMessagingInboxPolicyRefusal';

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
// AUTO is reachable, and only through the explicit two-step offer below. It is
// never a side effect of another choice and never inferred from INHERIT:
// inheriting a company default is not a delegation.
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

  // The three transitions that need no delegation. AUTO is deliberately NOT
  // here: it carries a delegation, so it has its own explicit two-step path
  // below and must never sit among one-press buttons.
  // Typed before the filter: an inline literal infers `mode: string`, which no
  // longer matches the mode union once it has been through `filter`.
  const offered: { mode: MessagingInboxBotMode; label: string }[] = [
    { mode: 'INHERIT', label: t`Follow the company` },
    { mode: 'ASSISTED', label: t`Drafts only` },
    { mode: 'OFF', label: t`Stop the bot` },
  ];

  const choices =
    known === null
      ? []
      : offered.filter((choice) => choice.mode !== known.localMode);

  // Each named precondition in its own words. BOT_DELEGATION_REQUIRED is the
  // one an operator meets without asking for AUTO: following the company lands
  // on automatic replies, which is a delegation and has to be chosen outright.
  const refusalCode: MessagingInboxPolicyRefusalCode | null =
    policy.writeState.kind === 'refused' ? policy.writeState.code : null;

  // The STALE sentence follows what became of the re-read it triggered.
  // Promising "it has been read again" over a read that failed told the
  // operator the read had both failed and succeeded, and offered no way out.
  const staleSentence =
    policy.rereadState.kind === 'done'
      ? t`Someone changed this policy, or the company's, while this screen was open. It has been read again — please choose once more.`
      : policy.rereadState.kind === 'reading'
        ? t`Someone changed this policy, or the company's, while this screen was open. Reading the current one now.`
        : policy.rereadState.kind === 'failed'
          ? t`Someone changed this policy, or the company's, while this screen was open, and the current one could not be read. Nothing was changed, and this choice cannot be made until it has been read.`
          : t`Someone changed this policy, or the company's, while this screen was open. Nothing was changed.`;

  const refusalSentence =
    refusalCode === 'BOT_DELEGATION_REQUIRED'
      ? t`Following the company would let the bot reply on its own here, and that has to be chosen explicitly. Use "Let the bot reply on its own" below instead. Nothing was changed.`
      : refusalCode === 'BOT_POLICY_RESTRICTION'
        ? t`The company or channel policy is stricter than that, so this conversation cannot be set to it. Nothing was changed.`
        : refusalCode === 'BOT_POLICY_STALE'
          ? staleSentence
          : refusalCode === 'CONVERSATION_CONTACT_REVIEW_REQUIRED'
            ? t`This conversation's phone number changed, so the bot may not reply on its own until someone reviews the contact. Nothing was changed.`
            : refusalCode === 'CONVERSATION_NOT_FOUND'
              ? t`This conversation no longer exists for this company. Nothing was changed.`
              : null;

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

      {/* Suppressed whenever a re-read is in flight or has failed. The refusal
          above already says which of those it is — and while a read is running
          this note would claim it "could not be read", which is the same
          contradiction one state earlier. */}
      {known === null &&
        policy.rereadState.kind !== 'failed' &&
        policy.rereadState.kind !== 'reading' && (
          <MessagingInboxNote role="status">
            {t`The bot policy could not be read, so it cannot be changed here. Replying by hand still works.`}
          </MessagingInboxNote>
        )}

      {/* The delegation path. Mounted only once the policy is readable and
          AUTO is not already the local mode, so its MCP discovery does not
          run on a thread where there is nothing to offer. */}
      {known !== null && known.localMode !== 'AUTO' && (
        <MessagingInboxAutoDelegationOffer
          isBusy={isBusy}
          onDelegate={() => policy.setMode('AUTO')}
        />
      )}

      {policy.writeState.kind === 'refused' && (
        <MessagingInboxNote role="alert">
          {refusalSentence ??
            (isNonEmptyString(policy.writeState.message)
              ? t`Change refused: ${policy.writeState.message}`
              : t`Change refused.`)}
        </MessagingInboxNote>
      )}

      {/* The one action that can unblock a failed re-read. Without a fresh
          revision every further attempt is refused identically, so offering
          nothing left the operator stuck. */}
      {policy.retryReread !== null && (
        <StyledRow>
          <Button
            variant="outline"
            size="sm"
            loading={policy.rereadState.kind === 'reading'}
            onClick={policy.retryReread}
          >
            {t`Read the policy again`}
          </Button>
        </StyledRow>
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
