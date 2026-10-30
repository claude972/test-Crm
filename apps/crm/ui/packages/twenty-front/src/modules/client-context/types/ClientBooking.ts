import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';

// One appointment this workspace actually received for a client record.
//
// WHAT THIS SURFACE NEEDS, NOT WHAT THE SERVER PUBLISHES: no contract is
// published for Cal.diy bookings. Every field is a requirement and every one
// of them is nullable.
export type ClientBooking = {
  id: string;
  title: string | null;
  // The appointment's own instants, as the source states them.
  startsAt: string | null;
  endsAt: string | null;
  // The source's own wording for the booking's state — accepted, cancelled,
  // rescheduled, whatever vocabulary it uses. Shown as a diagnostic label:
  // never parsed into syncStatus, because a provider saying "accepted" is not
  // the same fact as this workspace having a confirmation for the item.
  providerState: string | null;
  // The attendee as the source recorded them, which may differ from the
  // record's own address. Shown as it came, never reconciled here.
  attendeeEmail: string | null;
  provenance: ClientContextProvenance;
  syncStatus: ConnectorSyncStatus;
  syncReason: string | null;
};
