import { useLingui } from '@lingui/react/macro';

import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

type HermesPayloadProblemNoteProps = {
  problem: HermesPayloadProblem;
  // What the payload was supposed to describe, so the line stays specific.
  subject: string;
};

// A payload the screen could not read is an unknown state, never an empty one.
// The reason is named, because "unavailable" alone hides a version mismatch.
export const HermesPayloadProblemNote = ({
  problem,
  subject,
}: HermesPayloadProblemNoteProps) => {
  const { t } = useLingui();

  const reasons: Record<HermesPayloadProblem, string> = {
    missing: t`no answer`,
    'not-an-object': t`unexpected answer`,
    'unsupported-version': t`version not supported by this screen`,
    'unexpected-shape': t`unexpected shape`,
  };

  return (
    <ProspectionNote role="alert">
      {t`${subject}: unknown (${reasons[problem]}).`}
    </ProspectionNote>
  );
};
