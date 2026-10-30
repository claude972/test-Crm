import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientBookingCard } from '@/client-context/components/ClientBookingCard';
import { ClientContextSourceNote } from '@/client-context/components/ClientContextSourceNote';
import { CLIENT_CONTEXT_BOOKINGS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
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

type ClientBookingsSectionProps = {
  state: ClientContextSourceState<ClientBooking>;
};

// Appointments actually received for this client record, through the native
// CalendarEvent object. Nothing here calls or links to a booking application:
// a link is navigation, not an integration.
export const ClientBookingsSection = ({
  state,
}: ClientBookingsSectionProps) => {
  const { t } = useLingui();

  const counters: ProspectionCounter[] = [
    {
      key: 'appointments',
      label: t`Appointments`,
      count: buildClientContextSourceCount(state),
    },
  ];

  return (
    <Section.Root>
      <Section.Header
        title={t`Appointments`}
        description={t`Appointments received for this client, through the native calendar object. Received items only.`}
      />
      <ProspectionCounters counters={counters} />

      <ClientContextSourceNote
        state={state}
        sourceName={CLIENT_CONTEXT_BOOKINGS_SOURCE.name}
      />

      {state.kind === 'read' &&
        (state.entries.length === 0 ? (
          <SettingsEmptyPlaceholder>
            <Trans>No appointment received for this client.</Trans>
          </SettingsEmptyPlaceholder>
        ) : (
          <StyledList>
            {state.entries.map((booking) => (
              <ClientBookingCard key={booking.id} booking={booking} />
            ))}
          </StyledList>
        ))}
    </Section.Root>
  );
};
