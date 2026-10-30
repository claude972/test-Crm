import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { useMessagingInboxConnections } from '@/messaging-inbox/hooks/useMessagingInboxConnections';

import { HermesWaNote } from '@/hermes-wa-ui/components/HermesWaNote';

import { HermesWaConversationListPanel } from '@/hermes-wa-runtime/components/HermesWaConversationListPanel';
import { HermesWaThreadPanel } from '@/hermes-wa-runtime/components/HermesWaThreadPanel';
import { useHermesWaConversations } from '@/hermes-wa-runtime/hooks/useHermesWaConversations';

const StyledLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  min-height: 0;
  height: 100%;

  @media (max-width: 48rem) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledPlaceholder = styled.div`
  align-content: center;
  display: grid;
  justify-items: center;
  padding: ${themeCssVariables.spacing[6]};
`;

export type HermesWaInboxContainerProps = {
  // Opens the native Person form prefilled with a phone number.
  //
  // Absent by default, and that default is the honest one: this container is
  // mountable without the application's record-creation stack, and a capability
  // nobody supplied is not available. When it is absent the inspector says so
  // instead of showing a button that does nothing.
  //
  // The route-level component supplies it. See HermesWaInboxRuntime.
  onCreateContactRequested?: (phoneNumber: string) => void;
};

// The WhatsApp inbox: the conversation list and the open thread, wired to the
// server.
//
// What is branched here:
//   - the conversations, through `hermesInboxConversations` filtered to
//     WHATSAPP, with the contact fields the CRM inspector reads;
//   - the messages, through `hermesInboxMessagesV3` so the attachments arrive
//     typed;
//   - the human reply, through `hermesInboxReplyV3` with its client request id;
//   - the media lifecycle, through `hermesPrepareMediaUpload`, a raw-byte PUT
//     to the target the server named with exactly the content type it named,
//     `hermesFinalizeMediaUpload` and `hermesCancelMediaUpload`;
//   - the private media read, through `hermesMediaRead`, whose relative path is
//     fetched and turned into a revocable blob: URL that is revoked on unmount
//     and on every change of source;
//   - the per-thread bot policy, read and written through the operations this
//     repository already ships.
//
// What does NOT happen here: nothing is emitted at mount. The conversation
// list is read, which is a read; every write, every byte and every media
// access waits for someone to press something. There is no polling, no
// subscription and no effect that sends.
//
// The thread is mounted under a key tied to the conversation id. Opening
// another conversation therefore unmounts the previous one whole, which is also
// what revokes its blob: URLs.
export const HermesWaInboxContainer = ({
  onCreateContactRequested,
}: HermesWaInboxContainerProps) => {
  const { t } = useLingui();

  const conversations = useHermesWaConversations();
  const connections = useMessagingInboxConnections();

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  // Only a conversation this client actually read can be opened. Looked up in
  // the list rather than trusted from the state, so a selection left behind by
  // a refresh that dropped the thread cannot open a conversation the current
  // list does not contain.
  const selectedConversation =
    conversations.items.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? null;

  const handleConversationSelected = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleCreateContactRequested = useCallback(
    (phoneNumber: string) => {
      if (onCreateContactRequested === undefined) {
        return;
      }

      // Captured before anything is awaited inside the native form flow.
      const capturedPhoneNumber = phoneNumber;

      onCreateContactRequested(capturedPhoneNumber);

      // The attachment is the server's to make, so the only thing to do after
      // the form is to read again and let the native matching apply. Nothing
      // here writes a link, merges a contact or creates an opportunity.
      conversations.reload();
    },
    [conversations, onCreateContactRequested],
  );

  const connectionRead = connections.readChannel('WHATSAPP');

  return (
    <StyledLayout>
      <HermesWaConversationListPanel
        list={conversations}
        selectedConversationId={selectedConversationId}
        onConversationSelected={handleConversationSelected}
      />

      {selectedConversation === null ? (
        <StyledPlaceholder>
          <HermesWaNote>{t`Open a conversation to read it.`}</HermesWaNote>
        </StyledPlaceholder>
      ) : (
        <HermesWaThreadPanel
          key={selectedConversation.id}
          conversation={selectedConversation}
          connectionRead={connectionRead}
          onCreateContactRequested={
            onCreateContactRequested === undefined
              ? undefined
              : handleCreateContactRequested
          }
        />
      )}
    </StyledLayout>
  );
};
