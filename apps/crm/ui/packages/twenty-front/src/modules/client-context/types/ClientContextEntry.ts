import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';

// Which source an entry of the chronology came from. Not a wire value: the
// chronology is built on the client from the sources it was given, so this is
// the discriminator those builders use.
//
// 'booking' comes from the native CalendarEvent object and 'note' from the
// native Note object; 'form-response' comes from the Forms application. The
// integration contract lists messages as a fourth kind — those belong to the
// messaging surface and are deliberately not read here.
export type ClientContextEntryKind = 'form-response' | 'booking' | 'note';

// One entry of the client record's chronology, reduced to what every source
// can answer. The chronology holds received items only: nothing here is
// derived from a link, and nothing is placed on it that the workspace has not
// got.
export type ClientContextEntry = {
  kind: ClientContextEntryKind;
  // Unique across the merged list: the source kind and the item id together,
  // so two sources cannot collide on a shared identifier.
  key: string;
  id: string;
  // When the item happened at its source. Null when no usable instant came
  // with it, which places the entry in the undated group rather than at a
  // moment the client chose for it.
  occurredAt: string | null;
  // What the entry is, in the source's own words. Null when unnamed.
  title: string | null;
  provenance: ClientContextProvenance;
  syncStatus: ConnectorSyncStatus;
  syncReason: string | null;
};
