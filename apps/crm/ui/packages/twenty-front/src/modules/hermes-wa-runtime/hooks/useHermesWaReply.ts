import { useMutation } from '@apollo/client/react';
import { useCallback, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { isDefined } from 'kovaa-lab-shared/utils';

import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

import { HERMES_WA_REPLY_V3 } from '@/hermes-wa-runtime/graphql/metadata-mutations/hermesWaReplyV3';
import { type HermesWaMessageKind } from '@/hermes-wa-runtime/types/HermesWaRuntimeMessage';
import { type HermesWaSendState } from '@/hermes-wa-runtime/types/HermesWaSendState';
import { readHermesWaReplyResult } from '@/hermes-wa-runtime/utils/readHermesWaRuntimePayload';

// Exactly the input the contract publishes, and nothing else. No workspace id,
// no user id, no membership: the resolver derives all three from the session,
// and the contract states none of them is accepted in an input.
type HermesWaReplyV3Input = {
  conversationId: string;
  clientRequestId: string;
  kind: HermesWaMessageKind;
  text: string;
  assetId?: string;
};

// What a caller asks for. The clientRequestId is deliberately NOT a parameter:
// it is minted inside this hook, once per attempt, and nowhere else.
export type HermesWaReplyRequest =
  | { kind: 'TEXT'; conversationId: string; text: string }
  | {
      kind: 'IMAGE' | 'VIDEO';
      conversationId: string;
      text: string;
      assetId: string;
    }
  // A voice note carries no caption: the documented voice route has none, and
  // the contract requires AUDIO to travel with empty text. There is no `text`
  // field here, so no caller can supply one by accident.
  | { kind: 'AUDIO'; conversationId: string; assetId: string };

export type HermesWaReply = {
  state: HermesWaSendState;
  // Starts a new attempt. One UUID is minted here, and this is the only place
  // in the module that mints one for a send.
  send: (request: HermesWaReplyRequest) => void;
  // Asks the server once more what became of the attempt that is already on
  // the wire, replaying the SAME clientRequestId.
  //
  // The contract guarantees the original durable request id returns the
  // original result and never re-emits a provider POST, so this cannot send a
  // second message. It is offered on an unconfirmed outcome ONLY — the one
  // state where the question "did it go?" has no answer yet — and never as a
  // retry of a failure or a refusal.
  //
  // Null whenever that question does not apply.
  askOutcomeAgain: (() => void) | null;
  // Back to a local draft. Clears the attempt, so the next send mints a new id
  // for what will be new content.
  resetToDraft: () => void;
};

// One human reply attempt at a time.
//
// Three rules hold this together, and all three are about not sending a
// customer the same message twice:
//
//  1. The idempotency key is minted once per attempt — not per render, not per
//     replay. New content is a new attempt and gets a new key; the same
//     content never does.
//  2. Nothing retries on its own. The transport retry link is switched off for
//     this mutation with `skipRetry`, because a send that comes back by itself
//     after a timeout is exactly the duplicate the contract forbids. There is
//     no effect, no timer and no mount-time call in this file.
//  3. The scope is captured before any await. `conversationId` is read out of
//     the caller's request into a local const, built into the input, and that
//     frozen input is what every later step uses — never a ref or a state that
//     could have moved on to another thread while the request was in flight.
export const useHermesWaReply = (): HermesWaReply => {
  const [replyMutation] = useMutation<
    { hermesInboxReplyV3: unknown },
    { input: HermesWaReplyV3Input }
  >(HERMES_WA_REPLY_V3, { context: { skipRetry: true } });

  const [state, setState] = useState<HermesWaSendState>({ kind: 'draft' });

  // The attempt on the wire, kept whole so a replay repeats it byte for byte
  // rather than rebuilding it from whatever is in the composer now.
  const attemptRef = useRef<HermesWaReplyV3Input | null>(null);

  const runAttempt = useCallback(
    async (input: HermesWaReplyV3Input) => {
      attemptRef.current = input;
      setState({ kind: 'requested', clientRequestId: input.clientRequestId });

      try {
        const { data } = await replyMutation({ variables: { input } });
        const read = readHermesWaReplyResult(data?.hermesInboxReplyV3);

        setState(
          read.kind === 'read'
            ? {
                kind: 'accepted',
                clientRequestId: input.clientRequestId,
                message: read.value,
              }
            : // The request left and came back in a shape this client cannot
              // read. That is not a failure and not a send: it is unknown.
              { kind: 'unconfirmed', clientRequestId: input.clientRequestId },
        );
      } catch (error) {
        const failure = readMessagingInboxCallFailure(error);

        setState(
          // A refusal and a rejected input are answers: the server decided, so
          // nothing left for the provider and the outcome is known.
          failure.kind === 'denied' || failure.kind === 'rejected-input'
            ? { kind: 'failed', clientRequestId: input.clientRequestId, failure }
            : // Everything else — a timeout above all — leaves this client
              // unable to say whether the provider was reached. Unknown, and
              // never repaired into either answer.
              { kind: 'unconfirmed', clientRequestId: input.clientRequestId },
        );
      }
    },
    [replyMutation],
  );

  const send = useCallback(
    (request: HermesWaReplyRequest) => {
      // Captured here, before anything is awaited. Everything downstream reads
      // this frozen input and never the live request or any component state.
      const clientRequestId = v4();

      const input: HermesWaReplyV3Input =
        request.kind === 'AUDIO'
          ? {
              conversationId: request.conversationId,
              clientRequestId,
              kind: 'AUDIO',
              // Empty, as the contract requires: the documented voice route
              // has no caption, so there is nothing legitimate to put here.
              text: '',
              assetId: request.assetId,
            }
          : request.kind === 'TEXT'
            ? {
                conversationId: request.conversationId,
                clientRequestId,
                kind: 'TEXT',
                text: request.text,
              }
            : {
                conversationId: request.conversationId,
                clientRequestId,
                kind: request.kind,
                text: request.text,
                assetId: request.assetId,
              };

      void runAttempt(input);
    },
    [runAttempt],
  );

  const askOutcomeAgain = useCallback(() => {
    const attempt = attemptRef.current;

    if (!isDefined(attempt)) {
      return;
    }

    // The same input, the same clientRequestId. Nothing is re-minted.
    void runAttempt(attempt);
  }, [runAttempt]);

  const resetToDraft = useCallback(() => {
    attemptRef.current = null;
    setState({ kind: 'draft' });
  }, []);

  return {
    state,
    send,
    askOutcomeAgain: state.kind === 'unconfirmed' ? askOutcomeAgain : null,
    resetToDraft,
  };
};
