import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxComposer } from '@/messaging-inbox/components/MessagingInboxComposer';
import { MessagingInboxContactLink } from '@/messaging-inbox/components/MessagingInboxContactLink';
import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxLoadMore } from '@/messaging-inbox/components/MessagingInboxLoadMore';
import { MessagingInboxMessageRow } from '@/messaging-inbox/components/MessagingInboxMessageRow';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { MessagingInboxUnknownNote } from '@/messaging-inbox/components/MessagingInboxUnknownNote';
import { useMessagingInboxMessages } from '@/messaging-inbox/hooks/useMessagingInboxMessages';
import { channelHasSubject } from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';

const StyledThread = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledHeader = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeaderTop = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledHandle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledSubject = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledHeaderMeta = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMessageList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledFooterNote = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

type MessagingInboxThreadProps = {
  conversation: MessagingInboxConversation;
  connectionRead: MessagingInboxConnectionRead;
};

// One conversation's messages and its composer.
//
// Mounted under a key tied to the conversation id, so opening another thread
// starts a clean read instead of merging two histories.
//
// The composer appears only when the thread has been read AND the connection
// says replies are allowed. canSend is read on its own, never inferred from
// the connection state, and an unknown canSend leaves no Send button: a button
// this client cannot know is permitted is exactly the fake control the rules
// forbid.
export const MessagingInboxThread = ({
  conversation,
  connectionRead,
}: MessagingInboxThreadProps) => {
  const { t } = useLingui();

  const list = useMessagingInboxMessages(conversation.id);

  const showsSubject =
    conversation.channel !== null && channelHasSubject(conversation.channel);

  // 'absent' is the contract's NOT_CONFIGURED, so it cannot send. 'loading'
  // and 'unknown' say nothing, so they stay unknown rather than permissive.
  const canSend =
    connectionRead.kind === 'reported'
      ? connectionRead.connection.canSend
      : connectionRead.kind === 'absent'
        ? false
        : null;

  // The contract returns messages newest first, so the newest is the first
  // item. It is the message a draft would answer.
  const latestMessageId = list.items.length > 0 ? list.items[0].id : null;

  return (
    <StyledThread aria-label={t`Conversation`}>
      <StyledHeader>
        <StyledHeaderTop>
          <StyledHandle>
            {isNonEmptyString(conversation.contactHandle)
              ? conversation.contactHandle
              : t`No handle given`}
          </StyledHandle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            startIcon={<IconRefresh />}
            loading={list.status === 'loading'}
            onClick={list.reload}
          >
            {t`Refresh`}
          </Button>
        </StyledHeaderTop>

        {showsSubject && (
          <StyledSubject>
            {isNonEmptyString(conversation.subject)
              ? conversation.subject
              : t`No subject`}
          </StyledSubject>
        )}

        <StyledHeaderMeta>
          <MessagingInboxContactLink
            personId={conversation.personId}
            personMatchStatus={conversation.personMatchStatus}
          />
        </StyledHeaderMeta>
      </StyledHeader>

      <StyledBody>
        {list.status === 'loading' && (
          <MessagingInboxNote>
            <Trans>Loading…</Trans>
          </MessagingInboxNote>
        )}

        {list.status === 'denied' && (
          <>
            <MessagingInboxNote role="alert">
              <Trans>Not authorised to read this conversation.</Trans>
            </MessagingInboxNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'unreadable' && (
          <>
            <MessagingInboxUnknownNote
              headline={t`Messages unavailable.`}
              problem={list.problem}
            />
            <MessagingInboxNote>
              <Trans>Replying opens once the thread can be read.</Trans>
            </MessagingInboxNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'read' && (
          <>
            {list.unreadableItemCount > 0 && (
              <MessagingInboxNote role="alert">
                <Trans>
                  Some messages could not be read and are not listed.
                </Trans>
              </MessagingInboxNote>
            )}

            {list.items.length === 0 ? (
              <MessagingInboxNote>
                <Trans>No message in this conversation.</Trans>
              </MessagingInboxNote>
            ) : (
              <>
                {/* The order is the server's, and the contract publishes it.
                    Nothing is re-sorted here. */}
                <MessagingInboxNote>
                  <Trans>Newest first.</Trans>
                </MessagingInboxNote>
                <StyledMessageList>
                  {list.items.map((message) => (
                    <MessagingInboxMessageRow
                      key={message.id}
                      message={message}
                    />
                  ))}
                </StyledMessageList>
              </>
            )}

            <MessagingInboxLoadMore list={list} />
          </>
        )}
      </StyledBody>

      {list.status === 'read' && canSend === true && (
        <MessagingInboxComposer
          conversationId={conversation.id}
          latestMessageId={latestMessageId}
          onAccepted={list.reload}
        />
      )}

      {list.status === 'read' && canSend === false && (
        <StyledFooterNote>
          <MessagingInboxNote>
            <Trans>Replies are off on this channel.</Trans>
          </MessagingInboxNote>
        </StyledFooterNote>
      )}

      {list.status === 'read' && canSend === null && (
        <StyledFooterNote>
          <MessagingInboxNote>
            <Trans>Reply availability unknown.</Trans>
          </MessagingInboxNote>
        </StyledFooterNote>
      )}
    </StyledThread>
  );
};
