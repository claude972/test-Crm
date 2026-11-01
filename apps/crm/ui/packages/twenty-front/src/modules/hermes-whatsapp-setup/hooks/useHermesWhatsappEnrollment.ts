import { useApolloClient } from '@apollo/client/react';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  HERMES_WHATSAPP_ENROLLMENT_START,
  HERMES_WHATSAPP_ENROLLMENT_QR,
  HERMES_WHATSAPP_ENROLLMENT_STATUS,
  HERMES_WHATSAPP_ENROLLMENT_ACTIVATE,
} from '@/hermes-whatsapp-setup/graphql/hermesWhatsappEnrollment';
import {
  type HermesWhatsappEnrollmentOperation,
  type HermesWhatsappEnrollmentRead,
} from '@/hermes-whatsapp-setup/types/HermesWhatsappEnrollment';
import { readHermesWhatsappEnrollment } from '@/hermes-whatsapp-setup/utils/readHermesWhatsappEnrollment';
import { readHermesRuntimeFailure } from '@/hermes-admin-runtime/utils/readHermesRuntimeFailure';

type EnrollmentPhase =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'unknown'
  | 'denied'
  | 'failed'
  | 'refused'
  | 'stale';
type EnrollmentSnapshot = {
  epoch: object;
  phase: EnrollmentPhase;
  operation: HermesWhatsappEnrollmentOperation | null;
  read: HermesWhatsappEnrollmentRead | null;
  phoneNumber: string;
};

const OPERATIONS = {
  Start: HERMES_WHATSAPP_ENROLLMENT_START,
  Qr: HERMES_WHATSAPP_ENROLLMENT_QR,
  Status: HERMES_WHATSAPP_ENROLLMENT_STATUS,
  Activate: HERMES_WHATSAPP_ENROLLMENT_ACTIVATE,
};

export type HermesWhatsappEnrollmentScope = {
  workspaceId: string;
  sessionIdentity: object;
  expectedRevision: number;
};

export const useHermesWhatsappEnrollment = ({
  workspaceId,
  sessionIdentity,
  expectedRevision,
}: HermesWhatsappEnrollmentScope) => {
  const client = useApolloClient();
  const epoch = useMemo(
    () => ({}),
    [workspaceId, sessionIdentity, expectedRevision],
  );
  const currentEpoch = useRef(epoch);
  currentEpoch.current = epoch;
  const pending = useRef<{ epoch: object; ticket: number } | null>(null);
  const sequence = useRef(0);
  const emptySnapshot = useCallback(
    (): EnrollmentSnapshot => ({
      epoch,
      phase: 'idle',
      operation: null,
      read: null,
      phoneNumber: '',
    }),
    [epoch],
  );
  const [snapshot, setSnapshot] = useState<EnrollmentSnapshot>(emptySnapshot);
  const visible = snapshot.epoch === epoch ? snapshot : emptySnapshot();
  const snapshotRef = useRef(visible);
  snapshotRef.current = visible;

  const request = useCallback(
    async (
      operation: HermesWhatsappEnrollmentOperation,
      phoneNumber?: string,
    ) => {
      if (currentEpoch.current !== epoch || pending.current?.epoch === epoch)
        return;
      const previous = snapshotRef.current;
      // An uncertain write is recovered by reading, never by another creation.
      if (
        operation !== 'Status' &&
        ['unknown', 'stale', 'denied'].includes(previous.phase)
      )
        return;
      const ticket = ++sequence.current;
      pending.current = { epoch, ticket };
      setSnapshot({
        ...previous,
        epoch,
        phase: 'requesting',
        operation,
        phoneNumber: '',
        read: previous.read ? { ...previous.read, credential: null } : null,
      });
      const isCurrent = () =>
        currentEpoch.current === epoch && pending.current?.ticket === ticket;
      try {
        const input = {
          expectedRevision: previous.read?.view.revision ?? expectedRevision,
          ...(phoneNumber ? { phoneNumber } : {}),
        };
        const response = await client.mutate<Record<string, unknown>>({
          mutation: OPERATIONS[operation],
          variables: { input },
          fetchPolicy: 'no-cache',
          context: { skipRetry: true },
        });
        if (!isCurrent()) return;
        const read = readHermesWhatsappEnrollment(
          response.data?.[`hermesWhatsappEnrollment${operation}`],
        );
        setSnapshot({
          epoch,
          phase: read ? 'ready' : operation === 'Status' ? 'failed' : 'unknown',
          operation: null,
          read,
          phoneNumber: '',
        });
      } catch (error) {
        if (!isCurrent()) return;
        const codes = CombinedGraphQLErrors.is(error)
          ? error.errors.map((entry) => entry.extensions?.code)
          : [];
        const failure = readHermesRuntimeFailure(error);
        const knownRefusal =
          CombinedGraphQLErrors.is(error) &&
          error.errors.some((entry) =>
            [
              'WA_BOT_MUST_BE_OFF',
              'WA_CONNECTION_NOT_MANAGED',
              'WA_ENROLLMENT_QR_NOT_ALLOWED',
              'WA_ENROLLMENT_INPUT_INVALID',
            ].some((token) => entry.message.includes(token)),
          );
        const phase: EnrollmentPhase =
          failure.kind === 'session-replaced' || failure.kind === 'stale'
            ? 'stale'
            : failure.kind === 'rejected-input' || knownRefusal
              ? 'refused'
              : codes.some(
                    (code) =>
                      code === 'UNAUTHENTICATED' || code === 'FORBIDDEN',
                  )
                ? 'denied'
                : codes.some(
                      (code) =>
                        code === 'SESSION_REPLACED' ||
                        code === 'CONNECTION_REVISION_CONFLICT' ||
                        code === 'STALE',
                    )
                  ? 'stale'
                  : operation === 'Status'
                    ? 'failed'
                    : 'unknown';
        setSnapshot({
          ...previous,
          epoch,
          phase,
          operation: null,
          phoneNumber: '',
          read: previous.read ? { ...previous.read, credential: null } : null,
        });
      } finally {
        if (isCurrent()) pending.current = null;
      }
    },
    [client, epoch, expectedRevision],
  );

  useEffect(() => {
    setSnapshot(emptySnapshot());
    void request('Status');
    return () => {
      if (pending.current?.epoch === epoch) pending.current = null;
    };
  }, [emptySnapshot, epoch, request]);

  useEffect(() => {
    const credential = visible.read?.credential;
    if (!credential) return;
    const timer = window.setTimeout(
      () => {
        if (currentEpoch.current !== epoch) return;
        setSnapshot((current) =>
          current.epoch === epoch && current.read
            ? { ...current, read: { ...current.read, credential: null } }
            : current,
        );
      },
      Math.max(0, credential.displayUntil - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [epoch, visible.read?.credential]);

  const setPhoneNumber = (phoneNumber: string) => {
    setSnapshot((current) => ({
      ...(current.epoch === epoch ? current : emptySnapshot()),
      phoneNumber,
    }));
  };

  return { ...visible, request, setPhoneNumber };
};
