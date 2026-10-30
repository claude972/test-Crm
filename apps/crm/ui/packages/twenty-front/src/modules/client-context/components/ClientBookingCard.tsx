import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import { ClientContextItemCard } from '@/client-context/components/ClientContextItemCard';
import { CLIENT_CONTEXT_BOOKINGS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { ConnectorDiagnostics } from '@/connectors/components/ConnectorDiagnostics';

const StyledMeta = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type ClientBookingCardProps = {
  booking: ClientBooking;
};

// One appointment this workspace received.
//
// The source's own wording for the booking state is folded in as a diagnostic
// and is never promoted into the sync state above it: a provider saying
// "accepted" is a fact about the provider's calendar, not a confirmation that
// this workspace holds the item.
export const ClientBookingCard = ({ booking }: ClientBookingCardProps) => {
  const { t } = useLingui();

  return (
    <ClientContextItemCard
      Icon={CLIENT_CONTEXT_BOOKINGS_SOURCE.Icon}
      title={booking.title}
      untitledLabel={t`Untitled appointment`}
      syncStatus={booking.syncStatus}
      syncReason={booking.syncReason}
      provenance={booking.provenance}
      fallbackSourceName={CLIENT_CONTEXT_BOOKINGS_SOURCE.name}
    >
      <StyledMeta>
        <dt>{t`Starts`}</dt>
        <dd>
          <ClientContextInstant value={booking.startsAt} />
        </dd>
        <dt>{t`Ends`}</dt>
        <dd>
          <ClientContextInstant value={booking.endsAt} />
        </dd>
        <dt>{t`Attendee`}</dt>
        <dd>
          {/* As the source recorded it. It may differ from the record's own
              address, and nothing here reconciles the two. */}
          {isNonEmptyString(booking.attendeeEmail) ? (
            booking.attendeeEmail
          ) : (
            <StyledMissing>{t`Unknown`}</StyledMissing>
          )}
        </dd>
      </StyledMeta>

      <ConnectorDiagnostics providerState={booking.providerState} />
    </ClientContextItemCard>
  );
};
