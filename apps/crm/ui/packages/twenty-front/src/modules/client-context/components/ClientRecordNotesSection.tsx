import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextSourceNote } from '@/client-context/components/ClientContextSourceNote';
import { ClientRecordNoteCard } from '@/client-context/components/ClientRecordNoteCard';
import { CLIENT_CONTEXT_NOTES_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { buildClientContextSourceCount } from '@/client-context/utils/buildClientContextSourceCount';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

type ClientRecordNotesSectionProps = {
  state: ClientContextSourceState<ClientRecordNote>;
};

// Recorded Hermes actions attached to this client record through the native
// Note object. Received items only, as with the two sections above.
export const ClientRecordNotesSection = ({
  state,
}: ClientRecordNotesSectionProps) => {
  const { t } = useLingui();

  const counters: ProspectionCounter[] = [
    {
      key: 'notes',
      label: t`Recorded actions`,
      count: buildClientContextSourceCount(state),
    },
  ];

  return (
    <Section.Root>
      <Section.Header
        title={t`Recorded actions`}
        description={t`Actions recorded against this client. Received items only.`}
      />
      <ProspectionCounters counters={counters} />

      <ClientContextSourceNote
        state={state}
        sourceName={CLIENT_CONTEXT_NOTES_SOURCE.name}
      />

      {state.kind === 'read' &&
        (state.entries.length === 0 ? (
          <SettingsEmptyPlaceholder>
            <Trans>No action recorded for this client.</Trans>
          </SettingsEmptyPlaceholder>
        ) : (
          <StyledList>
            {state.entries.map((note) => (
              <ClientRecordNoteCard key={note.id} note={note} />
            ))}
          </StyledList>
        ))}
    </Section.Root>
  );
};
