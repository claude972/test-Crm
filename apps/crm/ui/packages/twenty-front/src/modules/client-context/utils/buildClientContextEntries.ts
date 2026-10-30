import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import {
  type ClientContextEntry,
  type ClientContextEntryKind,
} from '@/client-context/types/ClientContextEntry';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import {
  exactProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';

// The chronology of one client record, merged from the sources that answered.
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
  // reading as an empty record.
  unreadSourceKinds: ClientContextEntryKind[];
};

type BuildClientContextEntriesArgs = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
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

// An instant, or nothing. A timestamp that cannot be read is not ordered
// against the ones that can: it joins the undated group, because placing it at
// a guessed moment would put it in a position the source never stated.
const readSortableTime = (occurredAt: string | null): number | null => {
  const parsed = parseConnectorCheckedAt(occurredAt);

  return parsed.kind === 'at' ? parsed.date.getTime() : null;
};

export const buildClientContextEntries = ({
  formResponses,
  bookings,
}: BuildClientContextEntriesArgs): ClientContextChronology => {
  const readFormResponses =
    formResponses.kind === 'read' ? formResponses.entries : null;
  const readBookings = bookings.kind === 'read' ? bookings.entries : null;

  const unreadSourceKinds: ClientContextEntryKind[] = [
    ...(readFormResponses === null
      ? (['form-response'] as ClientContextEntryKind[])
      : []),
    ...(readBookings === null ? (['booking'] as ClientContextEntryKind[]) : []),
  ];

  const entries = [
    ...(readFormResponses ?? []).map(toFormResponseEntry),
    ...(readBookings ?? []).map(toBookingEntry),
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
  if (unreadSourceKinds.length === 2) {
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
