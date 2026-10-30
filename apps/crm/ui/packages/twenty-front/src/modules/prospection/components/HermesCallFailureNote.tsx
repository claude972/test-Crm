import { Trans, useLingui } from '@lingui/react/macro';

import { ProspectionDiagnostic } from '@/prospection/components/ProspectionDiagnostic';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesCallFailure } from '@/prospection/utils/readHermesCallFailure';

type HermesCallFailureNoteProps = {
  failure: HermesCallFailure;
  // Used for anything that is neither an authorisation answer nor the
  // contract's idempotency conflict.
  fallbackMessage: string;
};

// A refusal reads as a rule, not as a stack trace. The server's own wording
// stays available, folded.
export const HermesCallFailureNote = ({
  failure,
  fallbackMessage,
}: HermesCallFailureNoteProps) => {
  const { t } = useLingui();

  if (failure.kind === 'none') {
    return null;
  }

  const headline =
    failure.kind === 'denied'
      ? t`Not authorised: unrestricted workspace administrators only.`
      : failure.kind === 'conflict'
        ? // Both documented causes, because the wire carries one generic
          // CONFLICT for both: a reused batch id and a full workspace are
          // indistinguishable here. Naming only the batch id would send
          // someone to change an id that may never have been the problem.
          // The server's own wording is folded in below.
          t`Conflict: either this batch id is already used with different content, or this workspace keeps no more batches.`
        : fallbackMessage;

  return (
    <>
      <ProspectionNote role="alert">{headline}</ProspectionNote>
      {failure.kind === 'denied' && (
        <ProspectionNote>
          <Trans>API keys, apps and impersonated sessions are refused.</Trans>
        </ProspectionNote>
      )}
      <ProspectionDiagnostic message={failure.message} />
    </>
  );
};
