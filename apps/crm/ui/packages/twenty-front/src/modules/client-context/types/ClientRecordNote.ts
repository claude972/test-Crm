import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';

// A Hermes action recorded against a client record reaches it through the
// NATIVE Note object, not through an external API called from the browser. The
// shape below is modelled on that object as the frontend declares it in
// modules/activities/types/Note.ts — an Activity with id, createdAt, updatedAt,
// title and a rich-text bodyV2 — widened to nullable.
export type ClientRecordNote = {
  id: string;
  title: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // The body reduced to PLAIN TEXT by whoever reads the note. The rich-text
  // document itself is deliberately not carried here: this surface renders
  // text and never markup, so a received body cannot inject anything.
  //
  // Null when the body could not be reduced; an empty string is a note whose
  // body is empty. The two are different answers.
  bodyPreview: string | null;
  provenance: ClientContextProvenance;
  syncStatus: ConnectorSyncStatus;
  syncReason: string | null;
};
