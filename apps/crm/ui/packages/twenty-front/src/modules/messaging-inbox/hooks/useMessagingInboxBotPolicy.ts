import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';
import {
  type MessagingInboxBotMode,
  type MessagingInboxBotPolicyRead,
} from '@/messaging-inbox/types/MessagingInboxBotPolicy';
import { readMessagingInboxBotPolicy } from '@/messaging-inbox/utils/readMessagingInboxPayload';
import {
  type MessagingInboxPolicyRefusalCode,
  readMessagingInboxPolicyRefusal,
} from '@/messaging-inbox/utils/readMessagingInboxPolicyRefusal';

// `code` carries the server's own named precondition when it published one, so
// a refusal it made deliberately can be explained in those terms instead of
// being shown as a technical failure.
export type MessagingInboxBotPolicyWriteState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | {
      kind: 'refused';
      message: string | null;
      code: MessagingInboxPolicyRefusalCode | null;
    }
  | {
      kind: 'failed';
      message: string | null;
      code: MessagingInboxPolicyRefusalCode | null;
    };

export type MessagingInboxBotPolicyControl = {
  read: MessagingInboxBotPolicyRead;
  writeState: MessagingInboxBotPolicyWriteState;
  setMode: (mode: MessagingInboxBotMode) => void;
  resetWriteState: () => void;
};

// One conversation's policy, read from the server and changed through it.
//
// A failed read stays 'unknown'. It is not an absence of policy and it is not
// a reason to fall back to a permissive default: the caller keeps whatever it
// was showing and says the policy could not be read. This also covers a
// deployment whose schema does not expose these operations yet, so the screen
// degrades instead of breaking.
//
// The answer is authoritative and the request is not. Asking for AUTO does not
// make a conversation automatic: the server applies the most restrictive of
// the workspace or channel policy and this exception, and returns what it
// decided. Nothing here recomputes that.
export const useMessagingInboxBotPolicy = (
  conversationId: string | null,
): MessagingInboxBotPolicyControl => {
  const { data, loading, error, refetch } = useQuery<{
    hermesConversationBotPolicy: unknown;
  }>(HERMES_CONVERSATION_BOT_POLICY, {
    variables: { input: { conversationId } },
    skip: conversationId === null,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [writeState, setWriteState] =
    useState<MessagingInboxBotPolicyWriteState>({ kind: 'idle' });

  // skipRetry: a policy write must not be replayed by a transport retry. A
  // revoked delegation that comes back on its own is exactly the failure the
  // contract forbids.
  const [setPolicyMutation] = useMutation<
    { hermesSetConversationBotPolicy: unknown },
    {
      input: {
        conversationId: string;
        mode: string;
        expectedRevision: string;
        delegateAuto?: boolean;
      };
    }
  >(HERMES_SET_CONVERSATION_BOT_POLICY, { context: { skipRetry: true } });

  const read = useMemo<MessagingInboxBotPolicyRead>(() => {
    if (conversationId === null) {
      return { kind: 'unknown' };
    }

    if (loading) {
      return { kind: 'loading' };
    }

    if (error !== undefined) {
      return { kind: 'unknown' };
    }

    const payload = readMessagingInboxBotPolicy(
      data?.hermesConversationBotPolicy,
    );

    if (payload.kind !== 'read') {
      return { kind: 'unknown' };
    }

    // A policy is published only when it names this exact thread. An absent
    // or different id is not this conversation's policy, and showing it would
    // describe one thread with another's rules.
    if (payload.value.conversationId !== conversationId) {
      return { kind: 'unknown' };
    }

    return { kind: 'reported', policy: payload.value };
  }, [conversationId, data, error, loading]);

  const setMode = useCallback(
    (mode: MessagingInboxBotMode) => {
      // Without a revision there is nothing to compare, and a write that
      // cannot be refused for staleness is a write that can overwrite someone
      // else's decision.
      // The policy must name this exact thread. A revision read for another
      // conversation, or a policy with no id at all, would be compared
      // against the wrong record.
      if (
        conversationId === null ||
        read.kind !== 'reported' ||
        read.policy.revision === null ||
        read.policy.conversationId !== conversationId
      ) {
        setWriteState({ kind: 'refused', message: null, code: null });

        return;
      }

      setWriteState({ kind: 'requesting' });

      void setPolicyMutation({
        variables: {
          input: {
            conversationId,
            mode,
            expectedRevision: read.policy.revision,
            // Only an explicit request for automatic replies carries the
            // delegation. Every other transition travels without it.
            ...(mode === 'AUTO' ? { delegateAuto: true } : {}),
          },
        },
      })
        .then((answer) => {
          const applied = readMessagingInboxBotPolicy(
            answer.data?.hermesSetConversationBotPolicy,
          );

          // An answer that does not name this thread is not a success for it.
          // Refetching is the only honest next step: the screen asks again
          // rather than claiming a change it cannot attribute.
          setWriteState(
            applied.kind === 'read' &&
              applied.value.conversationId === conversationId
              ? { kind: 'idle' }
              : { kind: 'refused', message: null, code: null },
          );

          // Same here: an abort at unmount is not an outcome to report.
          return refetch().catch(() => undefined);
        })
        .catch((error: unknown) => {
          const { failure, code } = readMessagingInboxPolicyRefusal(error);

          // A named precondition is a refusal the server chose to make, even
          // though it travels as CONFLICT rather than FORBIDDEN. Calling it a
          // failure would invite a retry of a decision, not of a hiccup.
          setWriteState(
            code !== null || failure.kind === 'denied'
              ? { kind: 'refused', message: failure.message, code }
              : { kind: 'failed', message: failure.message, code },
          );

          // STALE means the revision in hand is the wrong one, so every
          // further attempt is refused the same way until it is replaced. The
          // re-read is issued here, which is also the only thing that makes
          // the message's "it has been read again" true.
          //
          // Its own rejection is swallowed: a read aborted because the thread
          // closed is not a second failure to report, and leaving it unhandled
          // surfaces as a stray error elsewhere.
          if (code === 'BOT_POLICY_STALE') {
            return refetch().catch(() => undefined);
          }

          return undefined;
        });
    },
    [conversationId, read, refetch, setPolicyMutation],
  );

  const resetWriteState = useCallback(() => {
    setWriteState({ kind: 'idle' });
  }, []);

  return { read, writeState, setMode, resetWriteState };
};
