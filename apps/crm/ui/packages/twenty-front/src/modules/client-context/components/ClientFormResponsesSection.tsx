import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextSourceNote } from '@/client-context/components/ClientContextSourceNote';
import { ClientFormResponseCard } from '@/client-context/components/ClientFormResponseCard';
import { CLIENT_CONTEXT_FORMS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

type ClientFormResponsesSectionProps = {
  state: ClientContextSourceState<ClientFormResponse>;
};

// Where this client's form responses are, rather than a list of its own.
//
// A form response is recorded as a CRM note, so the responses of a record are
// in the recorded-actions section below and there is no second stream to wait
// for. The section therefore carries no counter: a figure here would either
// read as "0 responses", which is false, or as an unknown, which is not true
// either — the responses are known, they are just counted as notes.
//
// Nothing here links to Forms. The integration contract states that a link to
// another application is navigation and not an integration, so a link next to
// this section would read as the integration itself.
export const ClientFormResponsesSection = ({
  state,
}: ClientFormResponsesSectionProps) => {
  const { t } = useLingui();

  return (
    <Section.Root>
      <Section.Header
        title={t`Form responses`}
        description={t`Responses from ${CLIENT_CONTEXT_FORMS_SOURCE.name} are recorded as notes on this client, and appear under recorded actions.`}
      />

      <ClientContextSourceNote
        state={state}
        sourceName={CLIENT_CONTEXT_FORMS_SOURCE.name}
      />

      {state.kind === 'read' &&
        (state.entries.length === 0 ? null : (
          <StyledList>
            {state.entries.map((response) => (
              <ClientFormResponseCard key={response.id} response={response} />
            ))}
          </StyledList>
        ))}
    </Section.Root>
  );
};
