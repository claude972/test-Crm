import { Trans, useLingui } from '@lingui/react/macro';

import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

type ClientContextSourceNoteProps = {
  // Typed against unknown entries on purpose: this note never looks at them,
  // and every source can hand it its own state without a cast.
  state: ClientContextSourceState<unknown>;
  sourceName: string;
};

// Why a source is showing nothing, said as a reason rather than as an absence.
// The five non-read states each get their own line: items recorded elsewhere
// on the record, a read in progress, a refusal, a workspace with nothing set
// up and a payload that could not be read are five different facts, and none
// of them means the client has no form response and no appointment.
export const ClientContextSourceNote = ({
  state,
  sourceName,
}: ClientContextSourceNoteProps) => {
  const { t } = useLingui();

  switch (state.kind) {
    case 'read':
      return null;

    case 'recorded-in-notes':
      // Not a wait and not an absence: the items are on this record already,
      // in its notes, so the line says where to read them instead of
      // promising a list that will never arrive here.
      return (
        <ProspectionNote>
          <Trans>Form responses are recorded in CRM notes.</Trans>
        </ProspectionNote>
      );

    case 'loading':
      return (
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      );

    case 'denied':
      return (
        <ProspectionNote role="alert">
          {t`Not authorised to read ${sourceName} for this record.`}
        </ProspectionNote>
      );

    case 'not-configured':
      return (
        <ProspectionNote>
          {t`${sourceName} is not set up for this workspace.`}
        </ProspectionNote>
      );

    case 'unreadable':
      // Reuses the prospection wording for the four ways a payload fails to be
      // read, so "unknown" never hides a version mismatch.
      return (
        <HermesPayloadProblemNote
          problem={state.problem}
          subject={sourceName}
        />
      );
  }
};
