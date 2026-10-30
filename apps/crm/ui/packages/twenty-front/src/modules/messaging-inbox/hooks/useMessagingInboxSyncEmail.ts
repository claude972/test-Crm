import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_INBOX_SYNC_EMAIL } from '@/messaging-inbox/graphql/metadata-mutations/hermesInboxSyncEmail';
import { type MessagingInboxEmailSyncRunState } from '@/messaging-inbox/types/MessagingInboxEmailSync';
import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';
import { readMessagingInboxEmailSyncResult } from '@/messaging-inbox/utils/readMessagingInboxPayload';

export type MessagingInboxEmailSync = {
  state: MessagingInboxEmailSyncRunState;
  syncEmail: () => void;
};

// One e-mail sync per press, and only on a press.
//
// There is no interval, no retry loop and no reaction to BUSY or to
// moreAvailable: both are reported to the operator, who decides whether to
// press again. A loop here would hammer a provider on the workspace's behalf
// and would amount to the live sync this screen is not allowed to claim.
export const useMessagingInboxSyncEmail = (): MessagingInboxEmailSync => {
  const [syncMutation] = useMutation<{ hermesInboxSyncEmail: unknown }>(
    HERMES_INBOX_SYNC_EMAIL,
  );

  const [state, setState] = useState<MessagingInboxEmailSyncRunState>({
    kind: 'idle',
  });

  const syncEmail = useCallback(() => {
    setState({ kind: 'running' });

    syncMutation()
      .then(({ data }) => {
        const read = readMessagingInboxEmailSyncResult(
          data?.hermesInboxSyncEmail,
        );

        setState(
          read.kind === 'read'
            ? { kind: 'read', result: read.value }
            : { kind: 'unreadable', problem: read.problem },
        );
      })
      .catch((error: unknown) => {
        setState({
          kind: 'failed',
          failure: readMessagingInboxCallFailure(error),
        });
      });
  }, [syncMutation]);

  return { state, syncEmail };
};
