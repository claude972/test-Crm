import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientBookingsSection } from '@/client-context/components/ClientBookingsSection';
import { ClientContextTimelineSection } from '@/client-context/components/ClientContextTimelineSection';
import { ClientFormResponsesSection } from '@/client-context/components/ClientFormResponsesSection';
import { ClientRecordNotesSection } from '@/client-context/components/ClientRecordNotesSection';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-width: 0;
`;

type ClientContextPanelProps = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
  notes: ClientContextSourceState<ClientRecordNote>;
};

// Everything a client record shows about its three context streams, in one
// mountable surface: the merged chronology first, then each stream with its own
// items and its own state. Messages are the integration contract's fourth kind
// and belong to the messaging surface, so they are absent here rather than
// faked.
//
// The panel is fed entirely through props. It holds no query and no HTTP
// client: appointments and recorded actions arrive through the native
// CalendarEvent and Note objects, Forms responses through a contract that is
// not published yet, and the surface that mounts it owns the reading.
export const ClientContextPanel = ({
  formResponses,
  bookings,
  notes,
}: ClientContextPanelProps) => (
  <StyledPanel>
    {/* The rule, stated once at the top of the surface. */}
    <ProspectionNote>
      <Trans>
        Received data only. Opening Forms or the booking application is
        navigation, not an integration.
      </Trans>
    </ProspectionNote>

    <ClientContextTimelineSection
      formResponses={formResponses}
      bookings={bookings}
      notes={notes}
    />
    <ClientFormResponsesSection state={formResponses} />
    <ClientBookingsSection state={bookings} />
    <ClientRecordNotesSection state={notes} />
  </StyledPanel>
);
