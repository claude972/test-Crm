import { Trans, useLingui } from '@lingui/react/macro';
import { Button } from 'kovaa-lab-ui/primitives/input';

import { HermesMailboxDiagnostic } from '@/hermes-mailbox-ui/components/HermesMailboxDiagnostic';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';

type HermesMailboxLoadNoteProps = {
  // Already translated by the caller, so each panel keeps its own sentence
  // instead of one message built around a variable.
  unavailableHeadline: string;
  load: HermesMailboxLoad<unknown>;
  // Offered on an expired page, because starting the list again is the only
  // way out of that state.
  onReload?: () => void;
};

// Every non-ready outcome of a panel's load, said the same way everywhere.
// It renders nothing for a ready load: an empty folder, an empty list and an
// empty thread are three different sentences, each written by its own panel.
export const HermesMailboxLoadNote = ({
  unavailableHeadline,
  load,
  onReload,
}: HermesMailboxLoadNoteProps) => {
  const { t } = useLingui();

  if (load.kind === 'loading') {
    return (
      <HermesMailboxNote role="status">
        <Trans>Loading…</Trans>
      </HermesMailboxNote>
    );
  }

  if (load.kind === 'notConfigured') {
    return (
      <HermesMailboxNote role="alert">
        <Trans>No mail provider is connected, so there is nothing to read.</Trans>
      </HermesMailboxNote>
    );
  }

  if (load.kind === 'denied') {
    return (
      <>
        <HermesMailboxNote role="alert">
          {t`Not authorised to read this.`}
        </HermesMailboxNote>
        <HermesMailboxDiagnostic message={load.message} />
      </>
    );
  }

  if (load.kind === 'pageExpired') {
    return (
      <>
        {/* Not an empty list and not a breakage: the cursor timed out. */}
        <HermesMailboxNote role="alert">
          <Trans>
            This page of results expired. Nothing was lost — it has to be
            loaded again.
          </Trans>
        </HermesMailboxNote>
        {onReload !== undefined && (
          <Button type="button" variant="outline" size="sm" onClick={onReload}>
            {t`Load it again`}
          </Button>
        )}
        <HermesMailboxDiagnostic message={load.message} />
      </>
    );
  }

  if (load.kind === 'unreadable') {
    return (
      <>
        {/* Unavailable, never empty: an operation the deployment does not
            expose and a mailbox with nothing in it are different facts. */}
        <HermesMailboxNote role="alert">
          {unavailableHeadline}
        </HermesMailboxNote>
        {load.problem === 'malformed' && (
          <HermesMailboxNote>
            <Trans>The answer did not match the contract.</Trans>
          </HermesMailboxNote>
        )}
        <HermesMailboxDiagnostic message={load.message} />
      </>
    );
  }

  return null;
};
