import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextSourceNote } from '@/client-context/components/ClientContextSourceNote';
import { ClientFormResponseCard } from '@/client-context/components/ClientFormResponseCard';
import { CLIENT_CONTEXT_FORMS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
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

type ClientFormResponsesSectionProps = {
  state: ClientContextSourceState<ClientFormResponse>;
};

// Forms responses actually received for this client record.
//
// Nothing here links to Forms. The integration contract states that a link to
// another application is navigation and not an integration, so a link next to
// this list would read as the integration itself. The list shows received
// items, and when there are none it says which of the six reasons applies.
export const ClientFormResponsesSection = ({
  state,
}: ClientFormResponsesSectionProps) => {
  const { t } = useLingui();

  const counters: ProspectionCounter[] = [
    {
      key: 'responses',
      label: t`Responses`,
      count: buildClientContextSourceCount(state),
    },
  ];

  return (
    <Section.Root>
      <Section.Header
        title={t`Form responses`}
        description={t`Responses received from ${CLIENT_CONTEXT_FORMS_SOURCE.name} for this client. Received items only.`}
      />
      <ProspectionCounters counters={counters} />

      <ClientContextSourceNote
        state={state}
        sourceName={CLIENT_CONTEXT_FORMS_SOURCE.name}
      />

      {state.kind === 'read' &&
        (state.entries.length === 0 ? (
          // A source that was read and holds nothing. The only case on this
          // surface where an empty list is a fact rather than an unknown.
          <SettingsEmptyPlaceholder>
            <Trans>No response received for this client.</Trans>
          </SettingsEmptyPlaceholder>
        ) : (
          <StyledList>
            {state.entries.map((response) => (
              <ClientFormResponseCard key={response.id} response={response} />
            ))}
          </StyledList>
        ))}
    </Section.Root>
  );
};
