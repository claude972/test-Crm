import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxLoadMore } from '@/messaging-inbox/components/MessagingInboxLoadMore';
import { type MessagingInboxCursorList } from '@/messaging-inbox/hooks/useMessagingInboxCursorList';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';

import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';

const StyledPanel = styled.nav`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledBody = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledEntry = styled.button`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  display: grid;
  gap: ${themeCssVariables.spacing[0.5]};
  justify-items: start;
  padding: ${themeCssVariables.spacing[2]};
  text-align: start;
  width: 100%;

  &[aria-current='true'] {
    border-color: ${themeCssVariables.border.color.strong};
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledHandle = styled.span`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

type HermesWaConversationListPanelProps = {
  list: MessagingInboxCursorList<MessagingInboxConversation>;
  selectedConversationId: string | null;
  onConversationSelected: (conversationId: string) => void;
};

// The WhatsApp conversations, as a list of things to open.
//
// The five states the rules ask for are all here and all distinct:
//   loading     — the read is in flight.
//   denied      — an authorisation answer. No retry is offered for it.
//   unreadable  — a payload that does not match the contract, or an operation
//                 the deployment does not expose. Never rendered as empty.
//   empty       — the server answered, with nothing in it. A real state.
//   read        — the list.
//
// Opening a conversation is a click. Nothing opens itself, so the thread's own
// read — and every media access under it — waits for a person.
export const HermesWaConversationListPanel = ({
  list,
  selectedConversationId,
  onConversationSelected,
}: HermesWaConversationListPanelProps) => {
  const { t } = useLingui();

  return (
    <StyledPanel aria-label={t`WhatsApp conversations`}>
      <StyledHeader>
        <StyledTitle>{t`WhatsApp`}</StyledTitle>
        <Button
          variant="outline"
          size="sm"
          startIcon={<IconRefresh />}
          onClick={list.reload}
        >
          {t`Refresh`}
        </Button>
      </StyledHeader>

      <StyledBody>
        {list.status === 'loading' && (
          <HermesWaNote>{t`Loading the conversations.`}</HermesWaNote>
        )}

        {list.status === 'denied' && (
          <>
            <HermesWaAlertNote role="alert">
              {t`You are not allowed to read this inbox.`}
            </HermesWaAlertNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'unreadable' && (
          <>
            <HermesWaAlertNote role="alert">
              {t`The conversations could not be read.`}
            </HermesWaAlertNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'read' && list.items.length === 0 && (
          <HermesWaNote>{t`No WhatsApp conversation yet.`}</HermesWaNote>
        )}

        {list.status === 'read' && list.items.length > 0 && (
          <StyledList>
            {list.items.map((conversation) => (
              <li key={conversation.id}>
                <StyledEntry
                  type="button"
                  aria-current={conversation.id === selectedConversationId}
                  onClick={() => onConversationSelected(conversation.id)}
                >
                  <StyledHandle>
                    {/* Provider-sourced, untrusted text. Rendered as text. */}
                    {isNonEmptyString(conversation.contactHandle)
                      ? conversation.contactHandle
                      : t`Unknown number`}
                  </StyledHandle>
                  {/* Absent rather than invented: a conversation whose last
                      activity the server did not report has no date here. */}
                  {isNonEmptyString(conversation.lastMessageAt) && (
                    <StyledMeta>{conversation.lastMessageAt}</StyledMeta>
                  )}
                </StyledEntry>
              </li>
            ))}
          </StyledList>
        )}

        {list.unreadableItemCount > 0 && (
          <HermesWaNote>
            {t`${list.unreadableItemCount} conversation(s) could not be read and are not shown.`}
          </HermesWaNote>
        )}

        <MessagingInboxLoadMore list={list} />
      </StyledBody>
    </StyledPanel>
  );
};
