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
// The same V3 policy as every other channel: it is read from the server for
// this exact conversation, and the effective mode is the server's answer. The
// mode is never recomputed here, and a policy that cannot be read says so.
//
// Shown outside the editor on purpose, so stopping the bot on a thread does
// not require opening a reply first. Replying by hand never depends on it.
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
