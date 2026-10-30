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
        ? // Says what a conflict IS and what to do, and attributes nothing.
          // This note is shared by the import, the qualification and the draft
          // forms, and the wire gives one generic CONFLICT for every cause
          // behind them — a reused batch id, a full workspace, a campaign
          // already advanced, a campaign limit. Listing the import's two
          // causes read as fact on the other two screens, which was the same
          // mistake as naming the batch id alone, one level up. The server's
          // own wording is folded in below when it sent any.
          t`Conflict: this no longer matches the server state. Reload before trying again.`
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
