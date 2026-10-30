import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';
import {
  type MessagingInboxBotMode,
  type MessagingInboxBotPolicyRead,
} from '@/messaging-inbox/types/MessagingInboxBotPolicy';
import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';
import { readMessagingInboxBotPolicy } from '@/messaging-inbox/utils/readMessagingInboxPayload';

export type MessagingInboxBotPolicyWriteState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'refused'; message: string | null }
  | { kind: 'failed'; message: string | null };

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

    return payload.kind === 'read'
      ? { kind: 'reported', policy: payload.value }
      : { kind: 'unknown' };
  }, [conversationId, data, error, loading]);

  const setMode = useCallback(
    (mode: MessagingInboxBotMode) => {
      // Without a revision there is nothing to compare, and a write that
      // cannot be refused for staleness is a write that can overwrite someone
      // else's decision.
      // The policy must be the one of the thread on screen. A revision read
      // for another conversation would be compared against the wrong record.
      if (
        conversationId === null ||
        read.kind !== 'reported' ||
        read.policy.revision === null ||
        (read.policy.conversationId !== null &&
          read.policy.conversationId !== conversationId)
      ) {
        setWriteState({ kind: 'refused', message: null });

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
        .then(() => {
          setWriteState({ kind: 'idle' });

          return refetch();
        })
        .catch((failure: unknown) => {
          setWriteState({
            kind: 'failed',
            message: readMessagingInboxCallFailure(failure),
          });
        });
    },
    [conversationId, read, refetch, setPolicyMutation],
  );

  const resetWriteState = useCallback(() => {
    setWriteState({ kind: 'idle' });
  }, []);

  return { read, writeState, setMode, resetWriteState };
};
