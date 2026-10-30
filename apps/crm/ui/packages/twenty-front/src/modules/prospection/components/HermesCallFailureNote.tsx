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
        ? t`Same batch id with different content. Use another batch id, or restore the original content.`
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
