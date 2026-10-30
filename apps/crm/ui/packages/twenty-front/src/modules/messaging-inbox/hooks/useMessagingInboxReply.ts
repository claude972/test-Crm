import { useMutation } from '@apollo/client/react';
import { useCallback, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_INBOX_REPLY } from '@/messaging-inbox/graphql/metadata-mutations/hermesInboxReply';
import { type MessagingInboxSendState } from '@/messaging-inbox/types/MessagingInboxSendState';
import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';
import { readMessagingInboxReplyResult } from '@/messaging-inbox/utils/readMessagingInboxPayload';

// Exactly the input the contract publishes. No workspace id: the resolver
// derives it from the session.
type MessagingInboxReplyInput = {
  conversationId: string;
  clientRequestId: string;
  text: string;
};

export type MessagingInboxReply = {
  state: MessagingInboxSendState;
  // Starts a new attempt: one UUID is minted here and nowhere else.
  sendReply: (conversationId: string, text: string) => void;
  // Replays the attempt that is already on the wire, with the SAME
  // clientRequestId. Null when there is nothing to replay.
  retrySend: (() => void) | null;
  // Back to a local draft. Clears the attempt, so the next send mints a new
  // idempotency key for new content.
  resetToDraft: () => void;
};

// One reply attempt at a time, per composer.
//
// The idempotency key is minted once per attempt — not per render and not per
// retry. A retry of the same body replays the same key so the server can
// refuse the duplicate instead of sending a second message to the customer.
// Changing the body is a new attempt and gets a new key, which is the
// composer's job to request.
export const useMessagingInboxReply = (): MessagingInboxReply => {
  const [replyMutation] = useMutation<
    { hermesInboxReply: unknown },
    { input: MessagingInboxReplyInput }
  >(HERMES_INBOX_REPLY);

  const [state, setState] = useState<MessagingInboxSendState>({
    kind: 'draft',
  });

  // The attempt currently on the wire, kept so a retry can replay it
  // byte-for-byte rather than rebuild it from whatever is in the textarea now.
  const attemptRef = useRef<MessagingInboxReplyInput | null>(null);

  const runAttempt = useCallback(
    async (input: MessagingInboxReplyInput) => {
      attemptRef.current = input;
      setState({ kind: 'requested', clientRequestId: input.clientRequestId });

      try {
        const { data } = await replyMutation({ variables: { input } });
        const read = readMessagingInboxReplyResult(data?.hermesInboxReply);

        setState(
          read.kind === 'read'
            ? {
                kind: 'accepted',
                clientRequestId: input.clientRequestId,
                message: read.value,
              }
            : {
                kind: 'unreadable',
                clientRequestId: input.clientRequestId,
                problem: read.problem,
              },
        );
      } catch (error) {
        setState({
          kind: 'failed',
          clientRequestId: input.clientRequestId,
          failure: readMessagingInboxCallFailure(error),
        });
      }
    },
    [replyMutation],
  );

  const sendReply = useCallback(
    (conversationId: string, text: string) => {
      void runAttempt({ conversationId, clientRequestId: v4(), text });
    },
    [runAttempt],
  );

  const retry = useCallback(() => {
    const attempt = attemptRef.current;

    if (!isDefined(attempt)) {
      return;
    }

    void runAttempt(attempt);
  }, [runAttempt]);

  const resetToDraft = useCallback(() => {
    attemptRef.current = null;
    setState({ kind: 'draft' });
  }, []);

  return {
    state,
    sendReply,
    // Retrying only makes sense on an attempt that ended badly. In every other
    // state the caller gets null and renders no retry control.
    retrySend:
      state.kind === 'failed' || state.kind === 'unreadable' ? retry : null,
    resetToDraft,
  };
};
