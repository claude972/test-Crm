import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useRef } from 'react';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { useMessagingInboxSyncEmail } from '@/messaging-inbox/hooks/useMessagingInboxSyncEmail';

const StyledPanel = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
`;

type MessagingInboxEmailSyncPanelProps = {
  // False when the connection says syncing is not allowed, so no button is
  // rendered at all rather than one that would be refused.
  canSync: boolean;
  // Called once a sync has answered, so the conversation list is re-read from
  // the server instead of the screen guessing what arrived.
  onSynced: () => void;
};

// Pulls e-mail in, once per press.
//
// BUSY is reported and nothing is retried: a sync is already running. BUSY and
// moreAvailable both leave the decision with the operator — there is no
// interval and no loop anywhere here, and this screen never claims a live
// feed.
export const MessagingInboxEmailSyncPanel = ({
  canSync,
  onSynced,
}: MessagingInboxEmailSyncPanelProps) => {
  const { t, i18n } = useLingui();

  const { state, syncEmail } = useMessagingInboxSyncEmail();

  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const syncedState = state.kind === 'read' ? state.result.state : null;

  useEffect(() => {
    // A sync that actually moved something is worth a re-read. BUSY and
    // NOT_CONFIGURED brought nothing in, so nothing is re-read for them.
    if (syncedState === 'SYNCED' || syncedState === 'PARTIAL') {
      onSyncedRef.current();
    }
  }, [syncedState]);

  if (!canSync) {
    return null;
  }

  return (
    <StyledPanel>
      <Button
        type="button"
        variant="outline"
        size="sm"
        startIcon={<IconRefresh />}
        loading={state.kind === 'running'}
        disabled={state.kind === 'running'}
        onClick={syncEmail}
      >
        {t`Sync email`}
      </Button>

      {state.kind === 'running' && (
        <MessagingInboxNote role="status">
          <Trans>Syncing…</Trans>
        </MessagingInboxNote>
      )}

      {state.kind === 'failed' && (
        <>
          <MessagingInboxNote role="alert">
            {state.failure.kind === 'denied' ? (
              <Trans>Not authorised to sync.</Trans>
            ) : (
              <Trans>Sync failed.</Trans>
            )}
          </MessagingInboxNote>
          <MessagingInboxDiagnostic message={state.failure.message} />
        </>
      )}

      {state.kind === 'unreadable' && (
        <MessagingInboxNote role="alert">
          <Trans>Sync answered, result unreadable.</Trans>
        </MessagingInboxNote>
      )}

      {state.kind === 'read' && (
        <>
          {state.result.state === 'BUSY' && (
            <MessagingInboxNote role="status">
              <Trans>A sync is already running.</Trans>
            </MessagingInboxNote>
          )}

          {state.result.state === 'NOT_CONFIGURED' && (
            <MessagingInboxNote role="alert">
              <Trans>Email is not set up.</Trans>
            </MessagingInboxNote>
          )}

          {state.result.state === 'UNAVAILABLE' && (
            <MessagingInboxNote role="alert">
              <Trans>Email sync unavailable.</Trans>
            </MessagingInboxNote>
          )}

          {state.result.state === 'PARTIAL' && (
            <MessagingInboxNote role="alert">
              <Trans>Partial sync.</Trans>
            </MessagingInboxNote>
          )}

          {state.result.state === null && (
            <MessagingInboxNote role="alert">
              {isNonEmptyString(state.result.unknownState)
                ? state.result.unknownState
                : t`Sync result unknown.`}
            </MessagingInboxNote>
          )}

          {/* The server's own counts. A figure it did not send is left out
              rather than printed as a zero. */}
          {state.result.received !== null && (
            <MessagingInboxNote>
              {t`${i18n.number(state.result.received)} received.`}
            </MessagingInboxNote>
          )}

          {/* moreAvailable justifies pressing the button again. It does not
              justify pressing it automatically. */}
          {state.result.moreAvailable === true && (
            <MessagingInboxNote>
              <Trans>More to sync. Press again.</Trans>
            </MessagingInboxNote>
          )}
        </>
      )}
    </StyledPanel>
  );
};
