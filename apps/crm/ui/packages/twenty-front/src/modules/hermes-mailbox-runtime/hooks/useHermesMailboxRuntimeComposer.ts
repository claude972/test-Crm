import { type DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useCallback, useRef, useState } from 'react';
import { v4 } from 'uuid';

import { HERMES_MAILBOX_RUNTIME_COMPOSE_MODES } from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import { HERMES_MAIL_CLONE_ATTACHMENT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCloneAttachmentV4';
import { HERMES_MAIL_CREATE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCreateDraftV4';
import { HERMES_MAIL_PLAN_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailPlanV4';
import { HERMES_MAIL_SAVE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSaveDraftV4';
import { HERMES_MAIL_SEND_NEW_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendNewV4';
import { HERMES_MAIL_SEND_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendV4';
import { type HermesMailboxRuntimeIdentityRead } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
import { type HermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { type HermesMailboxRuntimeScope } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimeScope';
import { toHermesMailboxAttachment } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeAttachments';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import {
  readHermesMailboxRuntimeClonedAsset,
  readHermesMailboxRuntimeDraftOutcome,
  readHermesMailboxRuntimeNewDraftOutcome,
  readHermesMailboxRuntimePlan,
  readHermesMailboxRuntimeSendOutcome,
} from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { parseHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

// Exactly the input `HermesMailComposeInput` publishes.
//
// There is no `subject`: the contract derives a reply's and a forward's
// subject from the original MIME server-side, and this input has no field for
// one, so an edited subject on those three stays local.
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
  attachmentIds?: string[];
};

// Exactly the input `HermesMailNewDraftInput` publishes. It does carry a
// subject, because a new message has no original to derive one from.
type HermesMailboxRuntimeNewDraftInput = {
  from: string;
  to?: string[];
  cc?: string[];
  subject: string;
  text: string;
  draftId: string;
  // Opaque. Sent back exactly as it arrived, which is what makes the save a
  // compare-and-swap rather than a blind append.
  draftRevision?: string;
  clientRequestId?: string;
  conversationId?: string;
  attachmentIds?: string[];
};

type HermesMailboxRuntimeAttempt =
  | { kind: 'compose'; input: HermesMailboxRuntimeComposeInput }
  | { kind: 'new'; input: HermesMailboxRuntimeNewDraftInput };

// Where the draft saved in this session landed in the provider's Drafts
// folder, so the container can offer to resume exactly that message.
export type HermesMailboxRuntimeSavedDraft = {
  draftId: string;
  draftRevision: string | null;
  conversationId: string | null;
  folder: string | null;
  uid: string | null;
  uidValidity: string | null;
  savedAt: string | null;
};

export type HermesMailboxRuntimeComposer = {
  envelope: HermesMailboxLoad<HermesMailboxEnvelope | null>;
  sendState: HermesMailboxSendState;
  draftSaveState: HermesMailboxDraftSaveState;
  planAnswer: (kind: HermesMailboxComposeKind) => void;
  composeNew: () => void;
  resumeDraft: (draftId: string) => void;
  closeComposer: () => void;
  requestSend: (composition: HermesMailboxComposition) => void;
  saveDraft: (composition: HermesMailboxComposition) => void;
  savedDraft: HermesMailboxRuntimeSavedDraft | null;
};

// Planning, composing, saving and sending one message.
//
// Rules from the contract that shape all of it:
//
// 1. The server plans an answer's recipients. A new message has no original,
//    so there is nothing to plan and the recipients are the ones a person
//    types; the library's offline planner is never consulted either way.
// 2. The sender is the mailbox the central connection binds, resolved before
//    anything else.
// 3. A draft has a stable id and an opaque revision. Both are kept and handed
//    straight back, never rebuilt.
// 4. A send attempt has its own id, distinct from the draft's, minted once.
//    After an uncertain outcome the same id and the same content are replayed
//    — never a new id, and never a retry this code started by itself.
// 5. A forward carries its files only through explicit clones, and references
//    the target asset ids the clone returned.
export const useHermesMailboxRuntimeComposer = ({
  scope,
  identity,
  message,
  savedDraft,
  onSavedDraft,
}: {
  scope: HermesMailboxRuntimeScope | null;
  identity: HermesMailboxRuntimeIdentityRead;
  message: HermesMailboxRuntimeMessage | null;
  // Held by the caller, above the folder, because resuming a draft means
  // walking into the provider's Drafts folder — and a per-folder state would
  // be thrown away by exactly that move.
  savedDraft: HermesMailboxRuntimeSavedDraft | null;
  onSavedDraft: (draft: HermesMailboxRuntimeSavedDraft) => void;
}): HermesMailboxRuntimeComposer => {
  const client = useApolloClient();

  const [envelope, setEnvelope] = useState<
    HermesMailboxLoad<HermesMailboxEnvelope | null>
  >({ kind: 'ready', value: null });
  const [sendState, setSendState] = useState<HermesMailboxSendState>({
    kind: 'idle',
  });
  const [draftSaveState, setDraftSaveState] =
    useState<HermesMailboxDraftSaveState>({ kind: 'idle' });

  // The conversation the server reserved. Opaque, carried back unchanged.
  const conversationIdRef = useRef<string | null>(null);

  // A forward's planning id. The server derives its draft conversation from
  // it, so a different id on the send would fork a second conversation and be
  // refused; it is minted at planning time and kept.
  const requestIdRef = useRef<string | null>(null);

  // The new message's stable draft identity and its opaque revision.
  const draftIdRef = useRef<string | null>(null);
  const draftRevisionRef = useRef<string | null>(null);

  // The immutable send attempt of a new message. Distinct from draftIdRef by
  // contract: one identifies the draft, the other identifies this attempt.
  const sendRequestIdRef = useRef<string | null>(null);

  // The attempt on the wire, kept byte for byte so an uncertain outcome is
  // replayed exactly rather than rebuilt from whatever is in the editor now.
  const attemptRef = useRef<HermesMailboxRuntimeAttempt | null>(null);
  const isAttemptUncertainRef = useRef(false);

  // Library attachment id -> the asset id valid in the conversation this
  // composition will be sent in. A forward's entry is the clone's id.
  const assetIdByAttachmentRef = useRef<Record<string, string>>({});

  const reset = useCallback(() => {
    conversationIdRef.current = null;
    requestIdRef.current = null;
    draftIdRef.current = null;
    draftRevisionRef.current = null;
    sendRequestIdRef.current = null;
    attemptRef.current = null;
    isAttemptUncertainRef.current = false;
    assetIdByAttachmentRef.current = {};
    setEnvelope({ kind: 'ready', value: null });
    setSendState({ kind: 'idle' });
    setDraftSaveState({ kind: 'idle' });
  }, []);

  const senderOf = useCallback(
    (address: string | null) => {
      const parsed = parseHermesMailboxAddress(address);

      return {
        address:
          parsed ?? ({ display: null, email: null, raw: address ?? '' } as HermesMailboxAddress),
        authority: identity.readAuthority(address),
      };
    },
    [identity],
  );

  const attachmentIdsOf = useCallback(
    (attachments: HermesMailboxAttachment[]): string[] =>
      attachments
        .map((attachment) => assetIdByAttachmentRef.current[attachment.id])
        .filter((assetId): assetId is string => assetId !== undefined),
    [],
  );

  // One mutation, read defensively, with no cache in the way.
  const mutate = useCallback(
    async (mutation: DocumentNode, input: unknown) => {
      const { data } = await client.mutate<Record<string, unknown>>({
        mutation,
        variables: { input },
        fetchPolicy: 'no-cache',
      });

      return data;
    },
    [client],
  );

  // Carry a forwarded thread's files into the forward's own conversation.
  //
  // Explicit, one file at a time, and only the ids the clone answered with are
  // kept: the send never reuses a source thread's assets.
  const cloneForwardAttachments = useCallback(
    async (
      source: HermesMailboxRuntimeMessage,
      targetConversationId: string,
    ): Promise<HermesMailboxAttachment[]> => {
      const result: HermesMailboxAttachment[] = [];

      for (const [index, attachment] of source.attachments.entries()) {
        if (
          attachment.state !== 'READY' ||
          attachment.assetId === null ||
          source.conversationId === null
        ) {
          result.push(
            toHermesMailboxAttachment(attachment, {
              index,
              targetAssetId: null,
            }),
          );

          continue;
        }

        let targetAssetId: string | null = null;

        try {
          const data = await mutate(HERMES_MAIL_CLONE_ATTACHMENT_V4, {
            sourceConversationId: source.conversationId,
            sourceAssetId: attachment.assetId,
            targetConversationId,
          });

          const read = readHermesMailboxRuntimeClonedAsset(
            data?.hermesMailCloneAttachmentV4,
          );

          targetAssetId = read.kind === 'read' ? read.value.assetId : null;
        } catch {
          // A file that could not be cloned is not carried. It stays visible
          // in the strip as a file that cannot be served, which is better than
          // a forward that quietly leaves without it.
          targetAssetId = null;
        }

        const row = toHermesMailboxAttachment(attachment, {
          index,
          targetAssetId,
        });

        if (targetAssetId !== null) {
          assetIdByAttachmentRef.current[row.id] = targetAssetId;
        }

        result.push(row);
      }

      return result;
    },
    [mutate],
  );

  const planAnswer = useCallback(
    (kind: HermesMailboxComposeKind) => {
      if (scope === null || identity.identity.kind === 'unknown') {
        // Without a scope there is nothing to answer, and without a resolved
        // mailbox there is no authorised sender. Either way the editor stays
        // closed rather than opening on locally guessed recipients.
        setEnvelope({ kind: 'unreadable', problem: 'missing', message: null });

        return;
      }

      const from = identity.identity.mailboxAddress;

      conversationIdRef.current = null;
      draftIdRef.current = null;
      draftRevisionRef.current = null;
      sendRequestIdRef.current = null;
      attemptRef.current = null;
      isAttemptUncertainRef.current = false;
      assetIdByAttachmentRef.current = {};
      // A forward reserves its draft conversation from this id, so it is
      // minted here and kept for the send that may follow.
      requestIdRef.current = kind === 'forward' ? v4() : null;
      setSendState({ kind: 'idle' });
      setDraftSaveState({ kind: 'idle' });
      setEnvelope({ kind: 'loading' });

      const run = async () => {
        const data = await mutate(HERMES_MAIL_PLAN_V4, {
          folder: scope.folder,
          uid: scope.uid,
          uidValidity: scope.uidValidity,
          mode: HERMES_MAILBOX_RUNTIME_COMPOSE_MODES[kind],
          from,
          text: '',
          ...(requestIdRef.current === null
            ? {}
            : { clientRequestId: requestIdRef.current }),
        });

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

        const attachments =
          kind === 'forward' &&
          message !== null &&
          read.value.conversationId !== null
            ? await cloneForwardAttachments(message, read.value.conversationId)
            : [];

        setEnvelope({
          kind: 'ready',
          value: {
            kind,
            threadId: scope.uid,
            // The server accepted this sender; the local answer says which
            // authority it is. A shared domain is never one of them.
            sender: senderOf(read.value.from),
            to: read.value.to
              .map((address) => parseHermesMailboxAddress(address))
              .filter(
                (address): address is HermesMailboxAddress => address !== null,
              ),
            cc: read.value.cc
              .map((address) => parseHermesMailboxAddress(address))
              .filter(
                (address): address is HermesMailboxAddress => address !== null,
              ),
            subject: read.value.subject,
            body: read.value.text,
            inReplyTo: read.value.inReplyTo,
            references: read.value.references,
            attachments,
          },
        });
      };

      run().catch((error: unknown) => {
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
    [
      cloneForwardAttachments,
      identity,
      message,
      mutate,
      scope,
      senderOf,
    ],
  );

  // A message that answers nothing.
  //
  // No server call: there is no original to plan from, so the editor opens on
  // an empty envelope whose only server-sourced value is the sender. The
  // stable draft id is minted here and is what the first save carries.
  const composeNew = useCallback(() => {
    if (identity.identity.kind === 'unknown') {
      setEnvelope({ kind: 'unreadable', problem: 'missing', message: null });

      return;
    }

    const draftId = v4();

    conversationIdRef.current = null;
    requestIdRef.current = null;
    draftIdRef.current = draftId;
    draftRevisionRef.current = null;
    sendRequestIdRef.current = null;
    attemptRef.current = null;
    isAttemptUncertainRef.current = false;
    assetIdByAttachmentRef.current = {};
    setSendState({ kind: 'idle' });
    setDraftSaveState({ kind: 'idle' });
    setEnvelope({
      kind: 'ready',
      value: {
        kind: 'new',
        // The draft's own identity stands in for a thread it does not have.
        threadId: draftId,
        sender: senderOf(identity.identity.mailboxAddress),
        to: [],
        cc: [],
        subject: '',
        body: '',
        inReplyTo: null,
        references: [],
        attachments: [],
      },
    });
  }, [identity, senderOf]);

  // Pick a saved draft back up.
  //
  // The recipients and the text come from the server's own read of the native
  // draft, not from a local copy, and the stable id and opaque revision are
  // restored as they were handed over.
  const resumeDraft = useCallback(
    (draftId: string) => {
      const record = savedDraft;

      // Resuming is offered only on a draft this session wrote: nothing
      // publishes draft identities, so a draft from another session cannot be
      // picked up and the screen does not pretend otherwise.
      if (
        identity.identity.kind === 'unknown' ||
        message === null ||
        record === null ||
        record.draftId !== draftId
      ) {
        setEnvelope({ kind: 'unreadable', problem: 'missing', message: null });

        return;
      }

      conversationIdRef.current = record.conversationId;
      requestIdRef.current = null;
      draftIdRef.current = draftId;
      draftRevisionRef.current = record.draftRevision;
      sendRequestIdRef.current = null;
      attemptRef.current = null;
      isAttemptUncertainRef.current = false;
      assetIdByAttachmentRef.current = {};

      const attachments = message.attachments.map((attachment, index) => {
        const row = toHermesMailboxAttachment(attachment, {
          index,
          // A draft's own parts are already scoped to the draft's
          // conversation, so each one's asset id is its target id.
          targetAssetId:
            message.conversationId !== null ? attachment.assetId : null,
        });

        if (attachment.assetId !== null && message.conversationId !== null) {
          assetIdByAttachmentRef.current[row.id] = attachment.assetId;
        }

        return row;
      });

      setSendState({ kind: 'idle' });
      setDraftSaveState({ kind: 'idle' });
      setEnvelope({
        kind: 'ready',
        value: {
          kind: 'new',
          threadId: draftId,
          sender: senderOf(identity.identity.mailboxAddress),
          to: message.to,
          cc: message.cc,
          subject: message.subject ?? '',
          body: message.text ?? '',
          inReplyTo: null,
          references: [],
          attachments,
        },
      });
    },
    [identity, message, savedDraft, senderOf],
  );

  const applySendOutcome = useCallback(
    (data: Record<string, unknown> | null | undefined, field: string) => {
      const read = readHermesMailboxRuntimeSendOutcome(data?.[field]);

      if (read.kind === 'notConfigured') {
        isAttemptUncertainRef.current = false;
        setSendState({ kind: 'notConfigured' });

        return;
      }

      if (read.kind === 'unreadable') {
        // The request did leave and the answer could not be read, which is an
        // unknown outcome: the attempt and its id are kept so a person can
        // replay the very same one.
        isAttemptUncertainRef.current = true;
        setSendState({ kind: 'failed', message: 'SEND_OUTCOME_UNCONFIRMED' });

        return;
      }

      if (read.value.status === 'ACCEPTED') {
        isAttemptUncertainRef.current = false;
        // A server receipt, never a delivery. The Sent copy and the draft's
        // disposition are separate facts and are not reported as part of it.
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

      // FAILED is a definitive refusal, so a corrected composition may legally
      // carry a new id. Anything else — UNCONFIRMED included — is uncertain
      // and keeps the reservation.
      isAttemptUncertainRef.current = read.value.status !== 'FAILED';
      setSendState({
        kind: 'failed',
        message: read.value.errorCode ?? read.value.status,
      });
    },
    [],
  );

  const runSend = useCallback(
    (attempt: HermesMailboxRuntimeAttempt) => {
      attemptRef.current = attempt;
      setSendState({ kind: 'requested' });

      const mutation =
        attempt.kind === 'new' ? HERMES_MAIL_SEND_NEW_V4 : HERMES_MAIL_SEND_V4;
      const field =
        attempt.kind === 'new' ? 'hermesMailSendNewV4' : 'hermesMailSendV4';

      mutate(mutation, attempt.input)
        .then((data) => applySendOutcome(data, field))
        .catch((error: unknown) => {
          const failure = readHermesMailboxRuntimeFailure(error);

          if (failure.kind === 'notConfigured') {
            isAttemptUncertainRef.current = false;
            setSendState({ kind: 'notConfigured' });

            return;
          }

          // A refused input reserved nothing, so the next attempt may mint a
          // fresh id. A forward keeps its id regardless: the server ties its
          // draft conversation to it.
          if (failure.kind === 'rejectedInput') {
            isAttemptUncertainRef.current = false;

            if (attempt.kind === 'new') {
              sendRequestIdRef.current = null;
              attemptRef.current = null;
            } else if (attempt.input.mode !== 'FORWARD') {
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
    [applySendOutcome, mutate],
  );

  const requestSend = useCallback(
    (composition: HermesMailboxComposition) => {
      if (identity.identity.kind === 'unknown') {
        return;
      }

      // An uncertain attempt is replayed exactly: same id, same content. The
      // server answers with the outcome it already stored instead of sending a
      // second copy.
      if (attemptRef.current !== null && isAttemptUncertainRef.current) {
        runSend(attemptRef.current);

        return;
      }

      const from = identity.identity.mailboxAddress;
      const attachmentIds = attachmentIdsOf(composition.attachments);

      if (composition.kind === 'new') {
        const draftId = draftIdRef.current;

        if (draftId === null) {
          return;
        }

        // Two distinct identifiers: the draft's stable one, and this one
        // immutable send attempt.
        const clientRequestId = sendRequestIdRef.current ?? v4();

        sendRequestIdRef.current = clientRequestId;

        runSend({
          kind: 'new',
          input: {
            from,
            to: composition.to,
            cc: composition.cc,
            subject: composition.subject,
            text: composition.body,
            draftId,
            clientRequestId,
            ...(conversationIdRef.current === null
              ? {}
              : { conversationId: conversationIdRef.current }),
            ...(attachmentIds.length === 0 ? {} : { attachmentIds }),
          },
        });

        return;
      }

      if (scope === null) {
        return;
      }

      const clientRequestId = requestIdRef.current ?? v4();

      requestIdRef.current = clientRequestId;

      runSend({
        kind: 'compose',
        input: {
          folder: scope.folder,
          uid: scope.uid,
          uidValidity: scope.uidValidity,
          mode: HERMES_MAILBOX_RUNTIME_COMPOSE_MODES[composition.kind],
          from,
          to: composition.to,
          cc: composition.cc,
          text: composition.body,
          clientRequestId,
          ...(conversationIdRef.current === null
            ? {}
            : { conversationId: conversationIdRef.current }),
          ...(attachmentIds.length === 0 ? {} : { attachmentIds }),
        },
      });
    },
    [attachmentIdsOf, identity, runSend, scope],
  );

  const saveDraft = useCallback(
    (composition: HermesMailboxComposition) => {
      if (identity.identity.kind === 'unknown') {
        return;
      }

      const from = identity.identity.mailboxAddress;

      setDraftSaveState({ kind: 'saving' });

      // A new message's draft goes through the draft operation, which carries
      // the stable identity, the opaque revision and the scoped attachments.
      if (composition.kind === 'new') {
        const draftId = draftIdRef.current;

        if (draftId === null) {
          setDraftSaveState({ kind: 'failed', message: null });

          return;
        }

        const attachmentIds = attachmentIdsOf(composition.attachments);

        mutate(HERMES_MAIL_CREATE_DRAFT_V4, {
          from,
          to: composition.to,
          cc: composition.cc,
          subject: composition.subject,
          text: composition.body,
          draftId,
          // Handed straight back, unparsed. Its only job is the
          // compare-and-swap the server performs against the native content.
          ...(draftRevisionRef.current === null
            ? {}
            : { draftRevision: draftRevisionRef.current }),
          ...(conversationIdRef.current === null
            ? {}
            : { conversationId: conversationIdRef.current }),
          ...(attachmentIds.length === 0 ? {} : { attachmentIds }),
        })
          .then((data) => {
            const read = readHermesMailboxRuntimeNewDraftOutcome(
              data?.hermesMailCreateDraftV4,
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

            // Kept verbatim for the next save and for a resume.
            draftRevisionRef.current = read.value.draftRevision;
            conversationIdRef.current =
              read.value.conversationId ?? conversationIdRef.current;

            onSavedDraft({
              draftId: read.value.draftId ?? draftId,
              draftRevision: read.value.draftRevision,
              conversationId: conversationIdRef.current,
              folder: read.value.folder,
              uid: read.value.uid,
              uidValidity: read.value.uidValidity,
              savedAt: null,
            });
            setDraftSaveState({
              kind: 'saved',
              draftId: read.value.draftId ?? draftId,
              savedAt: null,
            });
          })
          .catch((error: unknown) => {
            const failure = readHermesMailboxRuntimeFailure(error);

            setDraftSaveState(
              failure.kind === 'notConfigured'
                ? { kind: 'notConfigured' }
                : { kind: 'failed', message: failure.message },
            );
          });

        return;
      }

      if (scope === null) {
        setDraftSaveState({ kind: 'failed', message: null });

        return;
      }

      // The older reply/forward draft mutation. It publishes no stable draft
      // identity and refuses attachment ids, and neither is invented here.
      mutate(HERMES_MAIL_SAVE_DRAFT_V4, {
        folder: scope.folder,
        uid: scope.uid,
        uidValidity: scope.uidValidity,
        mode: HERMES_MAILBOX_RUNTIME_COMPOSE_MODES[composition.kind],
        from,
        to: composition.to,
        cc: composition.cc,
        text: composition.body,
        ...(composition.kind === 'forward' && requestIdRef.current !== null
          ? { clientRequestId: requestIdRef.current }
          : {}),
        ...(conversationIdRef.current === null
          ? {}
          : { conversationId: conversationIdRef.current }),
      })
        .then((data) => {
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
    [attachmentIdsOf, identity, mutate, onSavedDraft, scope],
  );

  return {
    envelope,
    sendState,
    draftSaveState,
    planAnswer,
    composeNew,
    resumeDraft,
    closeComposer: reset,
    requestSend,
    saveDraft,
    savedDraft,
  };
};
