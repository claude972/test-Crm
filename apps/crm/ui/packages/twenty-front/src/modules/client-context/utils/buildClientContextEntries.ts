import { type ClientBooking } from '@/client-context/types/ClientBooking';
import {
  type ClientContextEntry,
  type ClientContextEntryKind,
} from '@/client-context/types/ClientContextEntry';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import {
  exactProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';

// The chronology of one client record, merged from the sources that answered:
// Forms responses, appointments from the native CalendarEvent object, and
// recorded actions from the native Note object. Messages are the integration
// contract's fourth kind and belong to the messaging surface, so they are
// deliberately absent rather than faked here.
//
// The four-state counter vocabulary is reused from the prospection module
// rather than copied: a figure is exact, computed over part of the sources,
// still being read, or not known at all, and none of those four is a zero. A
// record whose sources could not be read has an UNKNOWN number of entries, not
// none.
export type ClientContextChronology = {
  // Received items only, newest first, undated ones last.
  entries: ClientContextEntry[];
  entryCount: ProspectionCount;
  // Sources that contributed nothing, so the gap stays attributable instead of
  // reading as a quiet client.
  unreadSourceKinds: ClientContextEntryKind[];
};

type BuildClientContextEntriesArgs = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
  notes: ClientContextSourceState<ClientRecordNote>;
};

const toFormResponseEntry = (
  response: ClientFormResponse,
): ClientContextEntry => ({
  kind: 'form-response',
  key: `form-response:${response.id}`,
  id: response.id,
  occurredAt: response.submittedAt,
  title: response.formTitle,
  provenance: response.provenance,
  syncStatus: response.syncStatus,
  syncReason: response.syncReason,
});

const toBookingEntry = (booking: ClientBooking): ClientContextEntry => ({
  kind: 'booking',
  key: `booking:${booking.id}`,
  id: booking.id,
  occurredAt: booking.startsAt,
  title: booking.title,
  provenance: booking.provenance,
  syncStatus: booking.syncStatus,
  syncReason: booking.syncReason,
});

const toNoteEntry = (note: ClientRecordNote): ClientContextEntry => ({
  kind: 'note',
  key: `note:${note.id}`,
  // createdAt, not updatedAt: the chronology places an action when it
  // happened, and a later edit does not move it.
  occurredAt: note.createdAt,
  id: note.id,
  title: note.title,
  provenance: note.provenance,
  syncStatus: note.syncStatus,
  syncReason: note.syncReason,
});

// An instant, or nothing. A timestamp that cannot be read is not ordered
// against the ones that can: it joins the undated group, because placing it at
// a guessed moment would put it in a position the source never stated.
const readSortableTime = (occurredAt: string | null): number | null => {
  const parsed = parseConnectorCheckedAt(occurredAt);

  return parsed.kind === 'at' ? parsed.date.getTime() : null;
};

const SOURCE_COUNT = 3;

export const buildClientContextEntries = ({
  formResponses,
  bookings,
  notes,
}: BuildClientContextEntriesArgs): ClientContextChronology => {
  // 'recorded-in-notes' is not a source that failed to answer: that stream's
  // items ARE the notes read below, so it contributes no entry of its own and
  // must not be counted as a gap. Counting it as unread would turn a complete
  // chronology into a permanently partial one.
  const readFormResponses =
    formResponses.kind === 'read'
      ? formResponses.entries
      : formResponses.kind === 'recorded-in-notes'
        ? []
        : null;
  const readBookings = bookings.kind === 'read' ? bookings.entries : null;
  const readNotes = notes.kind === 'read' ? notes.entries : null;

  const unreadSourceKinds: ClientContextEntryKind[] = [
    ...(readFormResponses === null
      ? (['form-response'] as ClientContextEntryKind[])
      : []),
    ...(readBookings === null ? (['booking'] as ClientContextEntryKind[]) : []),
    ...(readNotes === null ? (['note'] as ClientContextEntryKind[]) : []),
  ];

  const entries = [
    ...(readFormResponses ?? []).map(toFormResponseEntry),
    ...(readBookings ?? []).map(toBookingEntry),
    ...(readNotes ?? []).map(toNoteEntry),
  ].sort((left, right) => {
    const leftTime = readSortableTime(left.occurredAt);
    const rightTime = readSortableTime(right.occurredAt);

    // Undated entries go after every dated one, and keep their input order
    // between themselves: Array.prototype.sort is stable, so returning 0 here
    // does not reshuffle them.
    if (leftTime === null && rightTime === null) {
      return 0;
    }

    if (leftTime === null) {
      return 1;
    }

    if (rightTime === null) {
      return -1;
    }

    return rightTime - leftTime;
  });

  // No source answered: the number of entries is unknown, and an unavailable
  // count carries no value at all rather than a zero.
  if (unreadSourceKinds.length === SOURCE_COUNT) {
    return {
      entries,
      entryCount: unavailableProspectionCount(),
      unreadSourceKinds,
    };
  }

  // Partial without a denominator: counting sources would be a denominator in
  // the wrong unit, and a denominator equal to what was read would look
  // complete.
  return {
    entries,
    entryCount:
      unreadSourceKinds.length === 0
        ? exactProspectionCount(entries.length)
        : { status: 'partial', value: entries.length },
    unreadSourceKinds,
  };
};
