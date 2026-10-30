import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';

// An appointment reaches a client record through the NATIVE CalendarEvent
// object, not through a booking API called from the browser. The shape below is
// therefore modelled on that object as the frontend already declares it in
// modules/activities/calendar/types/CalendarEvent.ts — title, description,
// startsAt, endsAt, isFullDay, isCanceled, location, conferenceLink,
// externalCreatedAt, calendarEventParticipants — and every field is widened to
// nullable because this surface reads a payload it did not type.
//
// This module calls nothing. No URL, no tRPC client, no booking provider
// request originates here.

// The four values CalendarEvent participants carry on the wire, as presentation
// values. A fifth answer does not exist, so a payload carrying anything else is
// an unknown response rather than the closest-looking one of these.
export const CLIENT_BOOKING_ATTENDEE_RESPONSES = [
  'accepted',
  'declined',
  'needs-action',
  'tentative',
] as const;

export type ClientBookingAttendeeResponse =
  (typeof CLIENT_BOOKING_ATTENDEE_RESPONSES)[number];

export type ClientBookingAttendee = {
  // Stable list key within one appointment.
  id: string;
  // The address, as the participant record carries it. Shown as it came; this
  // surface never reconciles it against the record's own address.
  handle: string | null;
  displayName: string | null;
  isOrganizer: boolean | null;
  // The attendee's own answer, which is the PROVIDER's fact. It is never read
  // as, nor promoted into, the item's sync status: an attendee accepting an
  // invitation says nothing about whether this workspace holds a confirmation
  // for the item.
  response: ClientBookingAttendeeResponse | null;
};

export type ClientBooking = {
  id: string;
  title: string | null;
  startsAt: string | null;
  endsAt: string | null;
  // Null when the payload carried no readable boolean. A full-day appointment
  // has no meaningful clock time, and an unknown one is not a timed one.
  isFullDay: boolean | null;
  // Null when unknown. A cancelled appointment must never read as a live one,
  // and an unknown cancellation must never read as "not cancelled".
  isCanceled: boolean | null;
  location: string | null;
  // The conference link is carried as label and URL separately, and the
  // component renders the LABEL as text only. An untrusted URL from a received
  // payload is not turned into an anchor here: a link is not an integration,
  // and a clickable provider URL on a record is a phishing surface that needs
  // an explicit allow-listing decision first.
  conferenceLabel: string | null;
  conferenceUrl: string | null;
  // Null when the payload carried no readable participants array. An empty
  // array is an appointment with no attendee; null is an unknown attendee list.
  attendees: ClientBookingAttendee[] | null;
  // Free-text diagnostic from whatever produced the event. Folded away, shown
  // as a value, never parsed into a status.
  providerState: string | null;
  provenance: ClientContextProvenance;
  // Whether the source confirmed this item or the workspace is still holding
  // it locally. The two never read the same: see ConnectorSyncTag.
  syncStatus: ConnectorSyncStatus;
  syncReason: string | null;
};
