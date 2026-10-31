import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';

import { HERMES_SET_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-mutations/hermesSetConversationBotPolicy';
import { HERMES_CONVERSATION_BOT_POLICY } from '@/messaging-inbox/graphql/metadata-queries/hermesConversationBotPolicy';
import {
  type MessagingInboxBotMode,
  type MessagingInboxBotPolicy,
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

// What became of the re-read a STALE refusal triggers.
//
// Four answers, never two at once. A refusal whose message promises "it has
// been read again" may only render over 'done': when the re-read itself fails
// the operator was being told, in one breath, that the read failed and that it
// succeeded — with no way to try again.
//
// 'none' is "no re-read was called for", which is every other refusal.
export type MessagingInboxBotPolicyRereadState =
  | { kind: 'none' }
  | { kind: 'reading' }
  | { kind: 'done' }
  // The request failed. Nothing came back.
  | { kind: 'failed' }
  // Something came back and it was not this conversation's policy: null, the
  // wrong shape, or another thread's. Kept apart from 'failed' because the
  // cause differs — a connectivity blip versus an answer that cannot be
  // trusted — while the way out is the same retry.
  | { kind: 'unreadable' };

// The one validation both reads apply.
//
// Presence of a container is not presence of an answer: a payload of null or
// of the wrong shape is not a policy, and one naming another conversation is
// not THIS conversation's policy. The id check is the authority check — the
// answer has to prove it is about what was asked.
const readPolicyForConversation = (
  payload: unknown,
  conversationId: string,
): MessagingInboxBotPolicy | null => {
  const read = readMessagingInboxBotPolicy(payload);

  if (read.kind !== 'read') {
    return null;
  }

  return read.value.conversationId === conversationId ? read.value : null;
};

export type MessagingInboxBotPolicyControl = {
  read: MessagingInboxBotPolicyRead;
  writeState: MessagingInboxBotPolicyWriteState;
  // The outcome of the re-read, so a caller can say which of the three
  // happened instead of asserting the happy one.
  rereadState: MessagingInboxBotPolicyRereadState;
  setMode: (mode: MessagingInboxBotMode) => void;
  // Offered only when the re-read failed: without a fresh revision every
  // further attempt is refused identically, so a retry is the one action that
  // can unblock the operator.
  retryReread: (() => void) | null;
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

  const [rereadState, setRereadState] =
    useState<MessagingInboxBotPolicyRereadState>({ kind: 'none' });

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

    // A policy is published only when it names this exact thread. An absent
    // or different id is not this conversation's policy, and showing it would
    // describe one thread with another's rules.
    const policy = readPolicyForConversation(
      data?.hermesConversationBotPolicy,
      conversationId,
    );

    return policy === null
      ? { kind: 'unknown' }
      : { kind: 'reported', policy };
  }, [conversationId, data, error, loading]);

  // The re-read, with its outcome reported rather than discarded.
  //
  // Two things a resolved promise does not prove. A result carrying errors is
  // a failed read even though it resolved, which `errorPolicy: 'all'` makes
  // possible. And a result with no error whose payload is null, malformed or
  // about another conversation is not a policy that was read — judging it on
  // `data !== undefined` claimed success from the field merely existing.
  const runReread = useCallback(() => {
    setRereadState({ kind: 'reading' });

    return refetch()
      .then((result) => {
        if (result.error !== undefined) {
          setRereadState({ kind: 'failed' });

          return;
        }

        if (conversationId === null) {
          setRereadState({ kind: 'unreadable' });

          return;
        }

        setRereadState(
          readPolicyForConversation(
            result.data?.hermesConversationBotPolicy,
            conversationId,
          ) === null
            ? { kind: 'unreadable' }
            : { kind: 'done' },
        );
      })
      .catch(() => {
        // A network failure is not an abort. Swallowing it silently is what
        // let the "read again" sentence render over a read that never landed.
        setRereadState({ kind: 'failed' });
      });
  }, [conversationId, refetch]);

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
      setRereadState({ kind: 'none' });

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
          // Its outcome is reported, not swallowed: the sentence that promises
          // a successful re-read may only render once there has been one.
          if (code === 'BOT_POLICY_STALE') {
            return runReread();
          }

          setRereadState({ kind: 'none' });

          return undefined;
        });
    },
    [conversationId, read, refetch, runReread, setPolicyMutation],
  );

  const resetWriteState = useCallback(() => {
    setWriteState({ kind: 'idle' });
    setRereadState({ kind: 'none' });
  }, []);

  return {
    read,
    writeState,
    rereadState,
    setMode,
    retryReread:
      rereadState.kind === 'failed' || rereadState.kind === 'unreadable'
        ? runReread
        : null,
    resetWriteState,
  };
};
