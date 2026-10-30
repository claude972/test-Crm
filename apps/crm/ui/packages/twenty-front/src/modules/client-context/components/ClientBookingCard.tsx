import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { IconCircleOff, IconHelpCircle, IconVideo } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientBookingAttendeeTag } from '@/client-context/components/ClientBookingAttendeeTag';
import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import { ClientContextItemCard } from '@/client-context/components/ClientContextItemCard';
import { CLIENT_CONTEXT_BOOKINGS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { ConnectorDiagnostics } from '@/connectors/components/ConnectorDiagnostics';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

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

const StyledBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledAttendee = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledAttendeeName = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type ClientBookingCardProps = {
  booking: ClientBooking;
};

// One appointment this workspace received, through the native CalendarEvent
// object. Nothing here calls a booking application.
//
// Two provider facts are shown next to, and never merged into, the item's sync
// state: whether the event is cancelled, and what each attendee answered. A
// provider saying "accepted" is a fact about a calendar, not a confirmation
// that this workspace holds the item.
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
      {/* A cancelled appointment must never read as a live one, and an
          unknown cancellation must never read as "not cancelled". Only those
          two cases get a badge; a known live event needs none. */}
      {(booking.isCanceled === true || booking.isCanceled === null) && (
        <StyledBadges>
          {booking.isCanceled === true ? (
            <Tag
              color="red"
              variant="soft"
              borderStyle="solid"
              startIcon={<IconCircleOff />}
              weight="medium"
              truncate={false}
            >
              {t`Cancelled`}
            </Tag>
          ) : (
            <Tag
              color="gray"
              variant="outline"
              borderStyle="dashed"
              startIcon={<IconHelpCircle />}
              truncate={false}
            >
              {t`Cancellation unknown`}
            </Tag>
          )}
        </StyledBadges>
      )}

      <StyledMeta>
        <dt>{t`Starts`}</dt>
        <dd>
          {/* A full-day appointment has no meaningful clock time, so it is not
              given one. An unknown full-day flag keeps the time, because
              dropping it would hide a fact the payload did carry. */}
          <ClientContextInstant
            value={booking.startsAt}
            withTime={booking.isFullDay !== true}
          />
          {booking.isFullDay === true && <> · {t`All day`}</>}
          {booking.isFullDay === null && <> · {t`All-day flag unknown`}</>}
        </dd>
        <dt>{t`Ends`}</dt>
        <dd>
          <ClientContextInstant
            value={booking.endsAt}
            withTime={booking.isFullDay !== true}
          />
        </dd>
        <dt>{t`Location`}</dt>
        <dd>
          {isNonEmptyString(booking.location) ? (
            booking.location
          ) : (
            <StyledMissing>{t`Not given`}</StyledMissing>
          )}
        </dd>
        {/* The conference link's LABEL as text, with the URL only in the
            tooltip. It is deliberately not an anchor: a link is not an
            integration, and turning an untrusted URL from a received payload
            into something clickable needs an explicit allow-listing decision
            that has not been taken. */}
        {isNonEmptyString(booking.conferenceLabel) && (
          <>
            <dt>{t`Conference`}</dt>
            <dd>
              <Tag
                color="gray"
                variant="outline"
                borderStyle="solid"
                startIcon={<IconVideo />}
                truncate={false}
                title={booking.conferenceUrl ?? undefined}
              >
                {booking.conferenceLabel}
              </Tag>
            </dd>
          </>
        )}
      </StyledMeta>

      {booking.attendees === null ? (
        // An unreadable attendee array is an unknown attendee list, never an
        // appointment with nobody on it.
        <ProspectionNote role="alert">
          <Trans>Attendees unreadable for this appointment.</Trans>
        </ProspectionNote>
      ) : booking.attendees.length === 0 ? (
        <ProspectionNote>
          <Trans>No attendee recorded.</Trans>
        </ProspectionNote>
      ) : (
        <div>
          {booking.attendees.map((attendee) => (
            <StyledAttendee key={attendee.id}>
              <StyledAttendeeName>
                {isNonEmptyString(attendee.displayName) ? (
                  attendee.displayName
                ) : isNonEmptyString(attendee.handle) ? (
                  attendee.handle
                ) : (
                  <StyledMissing>{t`Unnamed attendee`}</StyledMissing>
                )}
                {attendee.isOrganizer === true && <> · {t`Organiser`}</>}
              </StyledAttendeeName>
              <ClientBookingAttendeeTag response={attendee.response} />
            </StyledAttendee>
          ))}
        </div>
      )}

      <ConnectorDiagnostics providerState={booking.providerState} />
    </ClientContextItemCard>
  );
};
