import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxBotModeControl } from '@/messaging-inbox/components/MessagingInboxBotModeControl';
import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxLoadMore } from '@/messaging-inbox/components/MessagingInboxLoadMore';
import { useMessagingInboxBotMode } from '@/messaging-inbox/hooks/useMessagingInboxBotMode';
import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';

import { HermesWaMessageBubble } from '@/hermes-wa-ui/components/HermesWaMessageBubble';
import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { readHermesWaDeliveryState } from '@/hermes-wa-ui/types/HermesWaDelivery';

import { HermesWaContactInspector } from '@/hermes-wa-runtime/components/HermesWaContactInspector';
import { HermesWaRuntimeAttachment } from '@/hermes-wa-runtime/components/HermesWaRuntimeAttachment';
import { HermesWaRuntimeComposer } from '@/hermes-wa-runtime/components/HermesWaRuntimeComposer';
import { useHermesWaMessages } from '@/hermes-wa-runtime/hooks/useHermesWaMessages';
import { useHermesWaReply } from '@/hermes-wa-runtime/hooks/useHermesWaReply';
import { readHermesWaContact } from '@/hermes-wa-runtime/types/HermesWaContactMatch';

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

const StyledAttachments = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

type HermesWaThreadPanelProps = {
  conversation: MessagingInboxConversation;
  connectionRead: MessagingInboxConnectionRead;
  // Opens the native Person form prefilled with the phone, then refreshes so
  // the server's own matching applies. Absent means this screen cannot open
  // it, which is said rather than shown as a dead button.
  onCreateContactRequested?: (phoneNumber: string) => void;
};

// One WhatsApp conversation: its CRM inspector, its messages with their
// attachments, its bot policy, and the human composer.
//
// Mounted under a key tied to the conversation id, so opening another thread
// starts a clean read instead of merging two histories — and so every blob:
// URL the previous thread handed out is revoked with it.
export const HermesWaThreadPanel = ({
  conversation,
  connectionRead,
  onCreateContactRequested,
}: HermesWaThreadPanelProps) => {
  const { t } = useLingui();

  const list = useHermesWaMessages(conversation.id);
  const reply = useHermesWaReply();
  const botModeControl = useMessagingInboxBotMode();

  const contact = readHermesWaContact({
    personId: conversation.personId,
    personMatchStatus: conversation.personMatchStatus,
    contactHandle: conversation.contactHandle,
  });

  return (
    <StyledThread aria-label={t`WhatsApp conversation`}>
      <StyledHeader>
        <StyledHeaderTop>
          <StyledHandle>
            {isNonEmptyString(conversation.contactHandle)
              ? conversation.contactHandle
              : t`Unknown number`}
          </StyledHandle>
          <Button
            variant="outline"
            size="sm"
            startIcon={<IconRefresh />}
            onClick={list.reload}
          >
            {t`Refresh`}
          </Button>
        </StyledHeaderTop>

        <HermesWaContactInspector
          contact={contact}
          onCreateContactRequested={onCreateContactRequested}
        />

        {/* Read and write of the per-thread bot policy, through the operations
            already in this repository. Replying by hand never depends on it. */}
        <MessagingInboxBotModeControl
          conversationId={conversation.id}
          reportedMode={conversation.botMode}
          control={botModeControl}
        />
      </StyledHeader>

      <StyledBody>
        {list.status === 'loading' && (
          <HermesWaNote>{t`Loading this conversation.`}</HermesWaNote>
        )}

        {list.status === 'denied' && (
          <>
            <HermesWaAlertNote role="alert">
              {t`You are not allowed to read this conversation.`}
            </HermesWaAlertNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'unreadable' && (
          <>
            <HermesWaAlertNote role="alert">
              {/* Never "no message": an operation the deployment does not
                  expose and a thread with nothing in it are different facts. */}
              {t`This conversation could not be read.`}
            </HermesWaAlertNote>
            <MessagingInboxDiagnostic message={list.failureMessage} />
          </>
        )}

        {list.status === 'read' && list.items.length === 0 && (
          <HermesWaNote>{t`No message in this conversation yet.`}</HermesWaNote>
        )}

        {list.status === 'read' && list.items.length > 0 && (
          <StyledMessageList>
            {list.items.map((message) => (
              <li key={message.base.id}>
                <HermesWaMessageBubble
                  // The inbox's direction read and the library's are the same
                  // three cases under the same names, so it is passed through
                  // rather than re-derived from a raw string this side already
                  // reduced once.
                  direction={message.base.direction}
                  // Customer content, rendered as text by the library and never
                  // as markup.
                  text={message.base.text}
                  timeLabel={message.base.occurredAt}
                  delivery={{
                    // The library reads the state itself, so it is handed
                    // the server's own word — the reduced one when this side
                    // recognised it, the raw one when it did not. An
                    // unrecognised status stays unrecognised on both sides.
                    state: readHermesWaDeliveryState(
                      message.base.status.kind === 'known'
                        ? message.base.status.status
                        : message.base.status.raw,
                    ),
                    errorCode: message.base.errorCode,
                  }}
                >
                  {message.attachments.length > 0 && (
                    <StyledAttachments>
                      {message.attachments.map((asset) => (
                        <HermesWaRuntimeAttachment
                          key={asset.id}
                          conversationId={conversation.id}
                          asset={asset}
                        />
                      ))}
                    </StyledAttachments>
                  )}
                </HermesWaMessageBubble>

                {message.unreadableAttachmentCount > 0 && (
                  <HermesWaNote>
                    {t`${message.unreadableAttachmentCount} attachment(s) could not be read.`}
                  </HermesWaNote>
                )}
              </li>
            ))}
          </StyledMessageList>
        )}

        {list.unreadableItemCount > 0 && (
          <HermesWaNote>
            {t`${list.unreadableItemCount} message(s) could not be read and are not shown.`}
          </HermesWaNote>
        )}

        <MessagingInboxLoadMore list={list} />
      </StyledBody>

      <HermesWaRuntimeComposer
        conversationId={conversation.id}
        connectionRead={connectionRead}
        reply={reply}
      />
    </StyledThread>
  );
};
