import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_INBOX_DRAFT_REPLY } from '@/messaging-inbox/graphql/metadata-mutations/hermesInboxDraftReply';
import { type MessagingInboxDraftState } from '@/messaging-inbox/types/MessagingInboxDraftReply';
import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';
import { readMessagingInboxDraftReply } from '@/messaging-inbox/utils/readMessagingInboxPayload';

type MessagingInboxDraftReplyInput = {
  conversationId: string;
  messageId: string;
};

export type MessagingInboxDraft = {
  state: MessagingInboxDraftState;
  requestDraft: (conversationId: string, messageId: string) => void;
  dismissDraft: () => void;
};

// Asks the bot for a draft, and stops there.
//
// This hook has no path to hermesInboxReply. It cannot send, and no caller may
// give it one: the contract requires a separate, explicit human reply call,
// and chaining the two here is exactly the automatic dispatch the contract
// forbids.
export const useMessagingInboxDraftReply = (): MessagingInboxDraft => {
  const [draftMutation] = useMutation<
    { hermesInboxDraftReply: unknown },
    { input: MessagingInboxDraftReplyInput }
  >(HERMES_INBOX_DRAFT_REPLY);

  const [state, setState] = useState<MessagingInboxDraftState>({
    kind: 'idle',
  });

  const requestDraft = useCallback(
    (conversationId: string, messageId: string) => {
      setState({ kind: 'requested' });

      draftMutation({ variables: { input: { conversationId, messageId } } })
        .then(({ data }) => {
          const read = readMessagingInboxDraftReply(data?.hermesInboxDraftReply);

          setState(
            read.kind === 'read'
              ? { kind: 'read', draft: read.value }
              : { kind: 'unreadable', problem: read.problem },
          );
        })
        .catch((error: unknown) => {
          setState({
            kind: 'failed',
            failure: readMessagingInboxCallFailure(error),
          });
        });
    },
    [draftMutation],
  );

  const dismissDraft = useCallback(() => setState({ kind: 'idle' }), []);

  return { state, requestDraft, dismissDraft };
};
