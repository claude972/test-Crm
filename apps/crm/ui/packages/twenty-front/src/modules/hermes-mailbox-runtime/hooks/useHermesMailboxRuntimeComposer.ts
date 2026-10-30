import { useMutation } from '@apollo/client/react';
import { useCallback, useRef, useState } from 'react';
import { v4 } from 'uuid';

import { HERMES_MAILBOX_RUNTIME_COMPOSE_MODES } from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import { HERMES_MAIL_PLAN_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailPlanV4';
import { HERMES_MAIL_SAVE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSaveDraftV4';
import { HERMES_MAIL_SEND_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendV4';
import { type HermesMailboxRuntimeScope } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimeScope';
import { type HermesMailboxRuntimeIdentityRead } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import {
  readHermesMailboxRuntimeDraftOutcome,
  readHermesMailboxRuntimePlan,
  readHermesMailboxRuntimeSendOutcome,
} from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { parseHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

// Exactly the input `HermesMailComposeInput` publishes, and nothing beside it.
//
// There is no `subject`: the contract derives a reply's and a forward's
// subject from the original MIME server-side, and this input has no field for
// one. Whatever a person types over the prepared subject therefore stays local
// — see the module's README note.
type HermesMailboxRuntimeComposeInput = {
  folder: string;
  uid: string;
  uidValidity: string;
  mode: 'REPLY' | 'REPLY_ALL' | 'FORWARD';
  from: string;
  to?: string[];
  cc?: string[];
  text: string;
  conversationId?: string;
  clientRequestId?: string;
};

export type HermesMailboxRuntimeComposer = {
  envelope: HermesMailboxLoad<HermesMailboxEnvelope | null>;
  sendState: HermesMailboxSendState;
  draftSaveState: HermesMailboxDraftSaveState;
  planAnswer: (kind: HermesMailboxComposeKind) => void;
  closeComposer: () => void;
  requestSend: (composition: HermesMailboxComposition) => void;
  saveDraft: (composition: HermesMailboxComposition) => void;
};

// Planning, saving and sending one answer.
//
// Three rules from the contract shape all of it:
//
// 1. The server plans the recipients. The planning call answers with a
//    prepared envelope, which is shown as the authority and may then be
//    edited by a person. The library's offline planner is never consulted.
// 2. The sender is the connected mailbox's exact handle. It is taken from the
//    connected account, never from a header on the message being answered.
// 3. A send carries one client request id, minted once. After an uncertain
//    outcome the same id and the same content are replayed — never a new id,
//    and never a retry this code started by itself.
export const useHermesMailboxRuntimeComposer = ({
  scope,
  identity,
}: {
  scope: HermesMailboxRuntimeScope | null;
  identity: HermesMailboxRuntimeIdentityRead;
}): HermesMailboxRuntimeComposer => {
  const [planMutation] = useMutation<{ hermesMailPlanV4: unknown }>(
    HERMES_MAIL_PLAN_V4,
  );
  const [sendMutation] = useMutation<{ hermesMailSendV4: unknown }>(
    HERMES_MAIL_SEND_V4,
  );
  const [saveDraftMutation] = useMutation<{ hermesMailSaveDraftV4: unknown }>(
    HERMES_MAIL_SAVE_DRAFT_V4,
  );

  const [envelope, setEnvelope] = useState<
    HermesMailboxLoad<HermesMailboxEnvelope | null>
  >({ kind: 'ready', value: null });
  const [sendState, setSendState] = useState<HermesMailboxSendState>({
    kind: 'idle',
  });
  const [draftSaveState, setDraftSaveState] =
    useState<HermesMailboxDraftSaveState>({ kind: 'idle' });

  // The conversation the planning call reserved. Opaque, carried back
  // unchanged: a forward is planned against its own canonical draft
  // conversation, and sending under a different one is refused by the server.
  const conversationIdRef = useRef<string | null>(null);

  // The request id of the composition currently open.
  //
  // A forward's id is minted when it is planned, because the server derives
  // the draft conversation from it and would fork a second one under another
  // id. A reply's id is minted on its first send.
  const requestIdRef = useRef<string | null>(null);

  // The attempt on the wire, kept byte for byte so an uncertain outcome is
  // replayed exactly rather than rebuilt from whatever is in the editor now.
  const attemptRef = useRef<HermesMailboxRuntimeComposeInput | null>(null);
  const isAttemptUncertainRef = useRef(false);

  const reset = useCallback(() => {
    conversationIdRef.current = null;
    requestIdRef.current = null;
    attemptRef.current = null;
    isAttemptUncertainRef.current = false;
    setEnvelope({ kind: 'ready', value: null });
    setSendState({ kind: 'idle' });
    setDraftSaveState({ kind: 'idle' });
  }, []);

  const buildInput = useCallback(
    (
      target: HermesMailboxRuntimeScope,
      from: string,
      kind: HermesMailboxComposeKind,
      fields: { to?: string[]; cc?: string[]; text: string },
      clientRequestId: string | null,
    ): HermesMailboxRuntimeComposeInput => ({
      folder: target.folder,
      uid: target.uid,
      uidValidity: target.uidValidity,
      mode: HERMES_MAILBOX_RUNTIME_COMPOSE_MODES[kind],
      from,
      ...(fields.to === undefined ? {} : { to: fields.to }),
      ...(fields.cc === undefined ? {} : { cc: fields.cc }),
      text: fields.text,
      ...(conversationIdRef.current === null
        ? {}
        : { conversationId: conversationIdRef.current }),
      ...(clientRequestId === null ? {} : { clientRequestId }),
    }),
    [],
  );

  const planAnswer = useCallback(
    (kind: HermesMailboxComposeKind) => {
      if (scope === null || identity.identity.kind === 'unknown') {
        // Without a scope there is nothing to answer, and without the
        // mailbox's own address there is no authorised sender to plan with.
        // Either way the editor stays closed rather than opening on locally
        // guessed recipients.
        setEnvelope({ kind: 'unreadable', problem: 'missing', message: null });

        return;
      }

      const from = identity.identity.mailboxAddress;

      conversationIdRef.current = null;
      attemptRef.current = null;
      isAttemptUncertainRef.current = false;
      // A forward reserves its draft conversation from this id, so it is
      // minted here and kept for the send that may follow.
      requestIdRef.current = kind === 'forward' ? v4() : null;
      setSendState({ kind: 'idle' });
      setDraftSaveState({ kind: 'idle' });
      setEnvelope({ kind: 'loading' });

      const input = buildInput(scope, from, kind, { text: '' }, requestIdRef.current);

      planMutation({ variables: { input } })
        .then(({ data }) => {
          const read = readHermesMailboxRuntimePlan(data?.hermesMailPlanV4);

          if (read.kind === 'notConfigured') {
            setEnvelope({ kind: 'notConfigured' });

            return;
          }

          if (read.kind === 'unreadable') {
            setEnvelope({
              kind: 'unreadable',
              problem: read.problem,
              message: null,
            });

            return;
          }

          conversationIdRef.current = read.value.conversationId;

          const senderAddress = parseHermesMailboxAddress(read.value.from);

          setEnvelope({
            kind: 'ready',
            value: {
              kind,
              threadId: scope.uid,
              sender: {
                address: senderAddress ?? {
                  display: null,
                  email: null,
                  raw: read.value.from ?? '',
                },
                // The server accepted this sender, and the local answer says
                // which of the two authorities it is. A shared domain is never
                // one of them.
                authority: identity.readAuthority(read.value.from),
              },
              to: read.value.to
                .map((address) => parseHermesMailboxAddress(address))
                .filter(
                  (address): address is HermesMailboxAddress =>
                    address !== null,
                ),
              cc: read.value.cc
                .map((address) => parseHermesMailboxAddress(address))
                .filter(
                  (address): address is HermesMailboxAddress =>
                    address !== null,
                ),
              subject: read.value.subject,
              body: read.value.text,
              inReplyTo: read.value.inReplyTo,
              references: read.value.references,
              // The planning payload publishes no attachment list, so none is
              // claimed. A forward's files are reserved server-side and are
              // not offered here.
              attachments: [],
            },
          });
        })
        .catch((error: unknown) => {
          const failure = readHermesMailboxRuntimeFailure(error);

          setEnvelope(
            failure.kind === 'notConfigured'
              ? { kind: 'notConfigured' }
              : failure.kind === 'denied'
                ? { kind: 'denied', message: failure.message }
                : failure.kind === 'expired'
                  ? { kind: 'pageExpired', message: failure.message }
                  : {
                      kind: 'unreadable',
                      problem: 'missing',
                      message: failure.message,
                    },
          );
        });
    },
    [buildInput, identity, planMutation, scope],
  );

  const runSend = useCallback(
    (input: HermesMailboxRuntimeComposeInput) => {
      attemptRef.current = input;
      setSendState({ kind: 'requested' });

      sendMutation({ variables: { input } })
        .then(({ data }) => {
          const read = readHermesMailboxRuntimeSendOutcome(
            data?.hermesMailSendV4,
          );

          if (read.kind === 'notConfigured') {
            isAttemptUncertainRef.current = false;
            setSendState({ kind: 'notConfigured' });

            return;
          }

          if (read.kind === 'unreadable') {
            // The request did leave and the server's answer could not be read,
            // which is an unknown outcome: the attempt and its id are kept so
            // a person can replay the very same one.
            isAttemptUncertainRef.current = true;
            setSendState({
              kind: 'failed',
              message: 'SEND_OUTCOME_UNCONFIRMED',
            });

            return;
          }

          if (read.value.status === 'ACCEPTED') {
            isAttemptUncertainRef.current = false;
            // A server receipt, never a delivery. The library's wording is
            // careful about that, and nothing here adds to it; the Sent-copy
            // state is deliberately not reported as part of acceptance.
            setSendState({ kind: 'accepted' });

            return;
          }

          if (
            read.value.status === 'FAILED' &&
            read.value.errorCode === 'NOT_CONFIGURED'
          ) {
            isAttemptUncertainRef.current = false;
            setSendState({ kind: 'notConfigured' });

            return;
          }

          // FAILED is a definitive refusal, so a corrected composition may
          // legally carry a new id. Anything else — UNCONFIRMED included — is
          // uncertain and keeps the reservation.
          isAttemptUncertainRef.current = read.value.status !== 'FAILED';
          setSendState({
            kind: 'failed',
            message: read.value.errorCode ?? read.value.status,
          });
        })
        .catch((error: unknown) => {
          const failure = readHermesMailboxRuntimeFailure(error);

          if (failure.kind === 'notConfigured') {
            isAttemptUncertainRef.current = false;
            setSendState({ kind: 'notConfigured' });

            return;
          }

          // A refused input reserved nothing, so the next attempt of a reply
          // may mint a fresh id. A forward keeps its id regardless: the server
          // ties its draft conversation to it.
          if (failure.kind === 'rejectedInput') {
            isAttemptUncertainRef.current = false;

            if (input.mode !== 'FORWARD') {
              requestIdRef.current = null;
              attemptRef.current = null;
            }

            setSendState({ kind: 'failed', message: failure.message });

            return;
          }

          // Everything else is an unknown outcome. No automatic retry is
          // started here, and the id is kept for the replay somebody asks for.
          isAttemptUncertainRef.current = true;
          setSendState({ kind: 'failed', message: failure.message });
        });
    },
    [sendMutation],
  );

  const requestSend = useCallback(
    (composition: HermesMailboxComposition) => {
      if (scope === null || identity.identity.kind === 'unknown') {
        return;
      }

      // An uncertain attempt is replayed exactly: same id, same content. The
      // server answers with the outcome it already stored instead of sending a
      // second copy.
      if (attemptRef.current !== null && isAttemptUncertainRef.current) {
        runSend(attemptRef.current);

        return;
      }

      const clientRequestId = requestIdRef.current ?? v4();

      requestIdRef.current = clientRequestId;

      runSend(
        buildInput(
          scope,
          identity.identity.mailboxAddress,
          composition.kind,
          {
            to: composition.to,
            cc: composition.cc,
            text: composition.body,
          },
          clientRequestId,
        ),
      );
    },
    [buildInput, identity, runSend, scope],
  );

  const saveDraft = useCallback(
    (composition: HermesMailboxComposition) => {
      if (scope === null || identity.identity.kind === 'unknown') {
        return;
      }

      setDraftSaveState({ kind: 'saving' });

      // Saving emits nothing. A forward passes the id its planning reserved,
      // because the draft belongs to that same canonical conversation.
      const input = buildInput(
        scope,
        identity.identity.mailboxAddress,
        composition.kind,
        { to: composition.to, cc: composition.cc, text: composition.body },
        composition.kind === 'forward' ? requestIdRef.current : null,
      );

      saveDraftMutation({ variables: { input } })
        .then(({ data }) => {
          const read = readHermesMailboxRuntimeDraftOutcome(
            data?.hermesMailSaveDraftV4,
          );

          if (read.kind === 'notConfigured') {
            setDraftSaveState({ kind: 'notConfigured' });

            return;
          }

          if (read.kind === 'unreadable' || read.value.state !== 'SAVED') {
            setDraftSaveState({
              kind: 'failed',
              message: read.kind === 'read' ? read.value.state : null,
            });

            return;
          }

          // This mutation publishes no stable draft identity and no saved-at
          // instant, so neither is invented. The stable identity belongs to
          // the newer draft operations, which this container does not reach.
          setDraftSaveState({ kind: 'saved', draftId: null, savedAt: null });
        })
        .catch((error: unknown) => {
          const failure = readHermesMailboxRuntimeFailure(error);

          setDraftSaveState(
            failure.kind === 'notConfigured'
              ? { kind: 'notConfigured' }
              : { kind: 'failed', message: failure.message },
          );
        });
    },
    [buildInput, identity, saveDraftMutation, scope],
  );

  return {
    envelope,
    sendState,
    draftSaveState,
    planAnswer,
    closeComposer: reset,
    requestSend,
    saveDraft,
  };
};
