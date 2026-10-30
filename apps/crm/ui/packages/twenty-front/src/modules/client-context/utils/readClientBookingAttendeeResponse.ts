import {
  CLIENT_BOOKING_ATTENDEE_RESPONSES,
  type ClientBookingAttendeeResponse,
} from '@/client-context/types/ClientBooking';

// The wire values CalendarEvent participants carry, mapped onto the four
// presentation values and nothing else.
//
// Written as an explicit table rather than a lowercase-and-hyphenate
// transformation: a transformation would silently accept a fifth value the
// native object does not define and turn it into a response this surface would
// then render as a real answer.
const RESPONSE_BY_WIRE_VALUE: Record<string, ClientBookingAttendeeResponse> = {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  NEEDS_ACTION: 'needs-action',
  TENTATIVE: 'tentative',
};

// Null for anything outside the four: an unknown response is never reported as
// the closest-looking one, and never as "no answer yet".
export const readClientBookingAttendeeResponse = (
  value: unknown,
): ClientBookingAttendeeResponse | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const mapped = RESPONSE_BY_WIRE_VALUE[value];

  return (CLIENT_BOOKING_ATTENDEE_RESPONSES as readonly string[]).includes(
    mapped,
  )
    ? mapped
    : null;
};
