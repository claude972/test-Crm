import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { MessagingInboxBotModeControl } from '@/messaging-inbox/components/MessagingInboxBotModeControl';
import { useMessagingInboxBotMode } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';

const StyledPanel = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
  min-width: 0;
`;

type HermesMailboxRuntimeBotPanelProps = {
  // The canonical conversation the mail read published for the open message.
  // Null means the server named none, and then there is nothing to key a
  // policy on.
  conversationId: string | null;
};

// The bot, on the mail message that is open.
//
// The same V3 policy as every other channel: the effective mode is the
// server's answer, never recomputed, and an unreadable one says so. Shown
// outside the editor so stopping the bot needs no reply open first.
export const HermesMailboxRuntimeBotPanel = ({
  conversationId,
}: HermesMailboxRuntimeBotPanelProps) => {
  // The V1 per-conversation mutation, passed because the control's signature
  // takes it. The control deliberately writes through the policy instead, so
  // nothing here can bypass a company OFF.
  const legacyControl = useMessagingInboxBotMode();

  if (conversationId === null) {
    return (
      <StyledPanel>
        <HermesMailboxNote role="status">
          <Trans>
            The server published no conversation for this message, so the bot
            cannot be addressed on it. Replying by hand still works.
          </Trans>
        </HermesMailboxNote>
      </StyledPanel>
    );
  }

  return (
    <StyledPanel>
      <MessagingInboxBotModeControl
        conversationId={conversationId}
        reportedMode={null}
        control={legacyControl}
      />
    </StyledPanel>
  );
};
