import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { HERMES_MAIL_MESSAGE_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessageV4';
import { type HermesMailboxRuntimeScope } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimeScope';
import { type HermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import { readHermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';

export type HermesMailboxRuntimeMessageRead = {
  load: HermesMailboxLoad<HermesMailboxRuntimeMessage | null>;
  reload: () => void;
};

// One message, read under the folder, UID and UIDVALIDITY it was listed with.
//
// Nothing is read without all three. A scope the list could not supply is not
// filled in with a guessed validity: the read is simply not made, and the
// panel says the message is unavailable.
export const useHermesMailboxRuntimeMessage = ({
  scope,
}: {
  scope: HermesMailboxRuntimeScope | null;
}): HermesMailboxRuntimeMessageRead => {
  const client = useApolloClient();

  const [load, setLoad] = useState<
    HermesMailboxLoad<HermesMailboxRuntimeMessage | null>
  >({ kind: 'ready', value: null });

  const requestRef = useRef(0);

  const runLoad = useCallback(
    async (target: HermesMailboxRuntimeScope | null) => {
      const requestId = requestRef.current + 1;

      requestRef.current = requestId;

      if (target === null) {
        // Nothing selected is a ready answer with no message in it, which the
        // thread panel renders as its own sentence.
        setLoad({ kind: 'ready', value: null });

        return;
      }

      setLoad({ kind: 'loading' });

      try {
        const { data } = await client.query<Record<string, unknown>>({
          query: HERMES_MAIL_MESSAGE_V4,
          variables: { input: target },
          fetchPolicy: 'no-cache',
        });

        if (requestRef.current !== requestId) {
          return;
        }

        const read = readHermesMailboxRuntimeMessage(data?.hermesMailMessageV4);

        setLoad(
          read.kind === 'read'
            ? { kind: 'ready', value: read.value }
            : read.kind === 'notConfigured'
              ? { kind: 'notConfigured' }
              : { kind: 'unreadable', problem: read.problem, message: null },
        );
      } catch (error) {
        if (requestRef.current !== requestId) {
          return;
        }

        const failure = readHermesMailboxRuntimeFailure(error);

        setLoad(
          failure.kind === 'notConfigured'
            ? { kind: 'notConfigured' }
            : failure.kind === 'denied'
              ? { kind: 'denied', message: failure.message }
              : // A UIDVALIDITY that no longer matches the selected mailbox is
                // this, and it is explicit: the row has to be found again in a
                // fresh list. It is never an empty message.
                failure.kind === 'expired'
                ? { kind: 'pageExpired', message: failure.message }
                : {
                    kind: 'unreadable',
                    problem: 'missing',
                    message: failure.message,
                  },
        );
      }
    },
    [client],
  );

  useEffect(() => {
    void runLoad(scope);
    // The scope is three primitives; depending on the object identity would
    // re-read the message on every parent render.
  }, [runLoad, scope?.folder, scope?.uid, scope?.uidValidity]);

  const reload = useCallback(() => {
    void runLoad(scope);
  }, [runLoad, scope]);

  return { load, reload };
};
