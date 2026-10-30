import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientBookingsSection } from '@/client-context/components/ClientBookingsSection';
import { ClientContextTimelineSection } from '@/client-context/components/ClientContextTimelineSection';
import { ClientFormResponsesSection } from '@/client-context/components/ClientFormResponsesSection';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
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
};

// Everything a client record shows about its two external sources, in one
// mountable surface: the merged chronology first, then each source with its
// own items and its own state.
//
// The panel is fed entirely through props. It holds no query, because no
// contract is published for either source; the surface that mounts it owns the
// reading, and until a contract exists it passes { kind: 'awaiting-contract' }
// and the panel says exactly that.
export const ClientContextPanel = ({
  formResponses,
  bookings,
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
    />
    <ClientFormResponsesSection state={formResponses} />
    <ClientBookingsSection state={bookings} />
  </StyledPanel>
);
