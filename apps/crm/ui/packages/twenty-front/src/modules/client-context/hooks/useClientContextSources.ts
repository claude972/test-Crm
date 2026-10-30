import {
  isBoolean,
  isNonEmptyString,
  isObject,
  isString,
} from '@sniptt/guards';
import { useMemo } from 'react';
import {
  CoreObjectNameSingular,
  type LinksMetadata,
} from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { isClientContextRecordObject } from '@/client-context/constants/ClientContextRecordObjects';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { useDoObjectMetadataItemsExist } from '@/object-metadata/hooks/useDoObjectMetadataItemsExist';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { type FieldRichTextValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { getRichTextFieldTextLines } from '@/object-record/record-field/ui/utils/getRichTextFieldTextLines';

type UseClientContextSourcesArgs = {
  recordId: string;
  objectNameSingular: string;
};

type ClientContextSources = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
  notes: ClientContextSourceState<ClientRecordNote>;
};

// One record as the record hooks hand it back: an id, and fields this surface
// did not type. Every read below widens to null rather than trusting a shape.
type NativeRecord = {
  id: string;
  [fieldName: string]: unknown;
};

// A native object carries no Hermes provenance: it was not received from
// another application, so there is no source id, no source label, no external
// identifier and no intake instant to state. Each one is left unset rather
// than filled with the section's own name, and the provenance list renders
// them as not provided.
const NATIVE_PROVENANCE: ClientContextProvenance = {
  sourceId: null,
  sourceLabel: null,
  externalId: null,
  receivedAt: null,
};

// Held locally, and nothing more. These items come from the workspace's own
// objects, which carry no provider acknowledgement, so the status is the one
// that says a confirmation is still outstanding. 'confirmed' would claim a
// fact no field read here states.
const LOCALLY_HELD_SYNC_STATUS = 'pending' as const;

// Null whenever the field carried no usable text. A blank string is not a
// value a reader can act on, so it is reported as unset rather than rendered
// as an empty label.
const readText = (value: unknown): string | null =>
  isString(value) && value.trim().length > 0 ? value : null;

// Null when the field carried no readable boolean. An unknown cancellation is
// never shown as "not cancelled".
const readFlag = (value: unknown): boolean | null =>
  isBoolean(value) ? value : null;

// The rich-text body reduced to plain text, with the repository's own reader.
// Null when there was no document to reduce; an empty string is a note whose
// body is empty, and the two are different answers.
const readBodyPreview = (value: unknown): string | null => {
  if (!isObject(value)) {
    return null;
  }

  return getRichTextFieldTextLines(value as FieldRichTextValue).join('\n');
};

// The LINKS composite, split into a label and a URL. The card renders the
// label as TEXT: an untrusted provider URL is not turned into an anchor on a
// client record.
const readConferenceLink = (
  value: unknown,
): { label: string | null; url: string | null } => {
  if (!isObject(value)) {
    return { label: null, url: null };
  }

  const links = value as Partial<LinksMetadata>;

  return {
    label: readText(links.primaryLinkLabel),
    url: readText(links.primaryLinkUrl),
  };
};

const readClientRecordNote = (record: NativeRecord): ClientRecordNote => ({
  id: record.id,
  title: readText(record.title),
  createdAt: readText(record.createdAt),
  updatedAt: readText(record.updatedAt),
  bodyPreview: readBodyPreview(record.bodyV2),
  provenance: NATIVE_PROVENANCE,
  syncStatus: LOCALLY_HELD_SYNC_STATUS,
  syncReason: null,
});

const readClientBooking = (record: NativeRecord): ClientBooking => {
  const conferenceLink = readConferenceLink(record.conferenceLink);

  return {
    id: record.id,
    title: readText(record.title),
    startsAt: readText(record.startsAt),
    endsAt: readText(record.endsAt),
    isFullDay: readFlag(record.isFullDay),
    isCanceled: readFlag(record.isCanceled),
    location: readText(record.location),
    conferenceLabel: conferenceLink.label,
    conferenceUrl: conferenceLink.url,
    // Attendees are NOT read: they live on the separate
    // calendarEventParticipant object, which CoreObjectNameSingular does not
    // name, so there is no object identifier here to query without inventing
    // one. Null is the type's "attendee list unknown", which is distinct from
    // an appointment with no attendee, and the card already says so.
    attendees: null,
    // The native calendar object carries no free-text provider diagnostic, so
    // none is claimed.
    providerState: null,
    provenance: NATIVE_PROVENANCE,
    syncStatus: LOCALLY_HELD_SYNC_STATUS,
    syncReason: null,
  };
};

// Which of the six states one native stream is in. The order matters, and each
// branch is a different fact: an object the workspace does not have, a role
// that may not read it, a query that failed, a query still running, and only
// then an answer. An empty entries array is reached ONLY through the last
// branch, so a zero is never shown in place of something unknown.
const buildNativeSourceState = <TEntry,>({
  isConfigured,
  canRead,
  hasError,
  isLoading,
  entries,
}: {
  isConfigured: boolean;
  canRead: boolean;
  hasError: boolean;
  isLoading: boolean;
  entries: TEntry[];
}): ClientContextSourceState<TEntry> => {
  if (!isConfigured) {
    return { kind: 'not-configured' };
  }

  if (!canRead) {
    return { kind: 'denied' };
  }

  // A read that failed is an absence of knowledge, never a read with no
  // entries. 'missing' is the payload problem that says the answer never
  // arrived; the other three describe a payload that did arrive and could not
  // be understood, which is not what a failed query is.
  if (hasError) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  if (isLoading) {
    return { kind: 'loading' };
  }

  return { kind: 'read', entries };
};

// The single seam between a client record and its three context streams.
//
// The two NATIVE streams are read here, from the workspace's own objects and
// their junction tables:
//
// - recorded actions through noteTarget -> note: the junction row carries
//   noteId plus one join column per targetable object (targetPersonId,
//   targetCompanyId, targetOpportunityId);
// - appointments through calendarEventTarget -> calendarEvent: same join
//   columns, plus calendarEventId.
//
// Those are the names the junctions actually declare — see
// twenty-server/src/modules/note/standard-objects/note-target.workspace-entity.ts
// and twenty-server/src/modules/calendar/common/standard-objects/calendar-event-target.workspace-entity.ts
// — and the join column is built with the repository's own
// getActivityTargetObjectFieldIdName rather than spelled out here, so a
// renamed target field cannot drift away from this file.
//
// Read in two steps rather than one nested selection, which is the shape the
// email thread surface already uses: the junction answers with ids, then the
// items are read by `id: { in: ... }`. The item object is then resolved in its
// own right, so its own absence and its own permissions are visible here
// instead of collapsing into a silently truncated selection.
//
// There is NO Forms response object, and there will not be one: the server
// records a form response as a CRM note, with its origin written inside the
// note body. So the form responses of a record are already in the notes read
// above, and the Forms stream has no list of its own — it reports
// 'recorded-in-notes' and the section says where to read them. Nothing here
// queries an invented object or field for them.
//
// No HTTP client either: nothing here calls a booking API or a forms API from
// the browser.
export const useClientContextSources = ({
  recordId,
  objectNameSingular,
}: UseClientContextSourcesArgs): ClientContextSources => {
  // Four objects, two per stream: the item and its junction. A workspace
  // predating either junction has no noteTarget / calendarEventTarget object,
  // and the stream is then not pending a contract, it is simply not set up.
  // Checked through metadata rather than by querying, because the record hooks
  // throw on an object the workspace does not have.
  const doNoteObjectsExist = useDoObjectMetadataItemsExist([
    CoreObjectNameSingular.Note,
    CoreObjectNameSingular.NoteTarget,
  ]);
  const doCalendarObjectsExist = useDoObjectMetadataItemsExist([
    CoreObjectNameSingular.CalendarEvent,
    CoreObjectNameSingular.CalendarEventTarget,
  ]);

  // The junctions carry one join column per targetable object, and only the
  // objects this surface is mounted on have one here. A record of any other
  // object therefore has no link to follow, which is not the same as a link
  // that came back empty.
  const isTargetableRecord = isClientContextRecordObject(objectNameSingular);
  const targetJoinColumnName = getActivityTargetObjectFieldIdName({
    nameSingular: objectNameSingular,
  });

  const areNotesConfigured = doNoteObjectsExist && isTargetableRecord;
  const areBookingsConfigured = doCalendarObjectsExist && isTargetableRecord;

  const targetFilter = useMemo(
    () => ({ [targetJoinColumnName]: { eq: recordId } }),
    [targetJoinColumnName, recordId],
  );

  // useFindManyRecords resolves its object through useObjectMetadataItem,
  // which throws on an absent object, and a hook cannot be called
  // conditionally. The record's own object is therefore passed as the inert
  // fallback — it exists, since this surface is rendered on one of its records
  // — and the query is skipped, so nothing is ever read from it.
  const {
    records: noteTargetRecords,
    loading: noteTargetsLoading,
    error: noteTargetsError,
    objectMetadataItem: noteTargetObjectMetadataItem,
  } = useFindManyRecords({
    objectNameSingular: areNotesConfigured
      ? CoreObjectNameSingular.NoteTarget
      : objectNameSingular,
    filter: targetFilter,
    recordGqlFields: { id: true, noteId: true },
    skip: !areNotesConfigured,
  });

  const noteTargetPermissions = useObjectPermissionsForObject(
    noteTargetObjectMetadataItem.id,
  );

  const noteIds = useMemo(
    () => [
      ...new Set(
        noteTargetRecords
          .map((noteTarget) => noteTarget.noteId)
          .filter(isNonEmptyString),
      ),
    ],
    [noteTargetRecords],
  );

  const {
    records: noteRecords,
    loading: notesLoading,
    error: notesError,
    objectMetadataItem: noteObjectMetadataItem,
  } = useFindManyRecords({
    objectNameSingular: areNotesConfigured
      ? CoreObjectNameSingular.Note
      : objectNameSingular,
    filter: { id: { in: noteIds } },
    orderBy: [{ createdAt: 'DescNullsLast' }],
    recordGqlFields: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      bodyV2: true,
    },
    skip: !areNotesConfigured || noteIds.length === 0,
  });

  const notePermissions = useObjectPermissionsForObject(
    noteObjectMetadataItem.id,
  );

  const {
    records: calendarEventTargetRecords,
    loading: calendarEventTargetsLoading,
    error: calendarEventTargetsError,
    objectMetadataItem: calendarEventTargetObjectMetadataItem,
  } = useFindManyRecords({
    objectNameSingular: areBookingsConfigured
      ? CoreObjectNameSingular.CalendarEventTarget
      : objectNameSingular,
    filter: targetFilter,
    recordGqlFields: { id: true, calendarEventId: true },
    skip: !areBookingsConfigured,
  });

  const calendarEventTargetPermissions = useObjectPermissionsForObject(
    calendarEventTargetObjectMetadataItem.id,
  );

  const calendarEventIds = useMemo(
    () => [
      ...new Set(
        calendarEventTargetRecords
          .map((calendarEventTarget) => calendarEventTarget.calendarEventId)
          .filter(isNonEmptyString),
      ),
    ],
    [calendarEventTargetRecords],
  );

  const {
    records: calendarEventRecords,
    loading: calendarEventsLoading,
    error: calendarEventsError,
    objectMetadataItem: calendarEventObjectMetadataItem,
  } = useFindManyRecords({
    objectNameSingular: areBookingsConfigured
      ? CoreObjectNameSingular.CalendarEvent
      : objectNameSingular,
    filter: { id: { in: calendarEventIds } },
    // Applied to the calendar object only: the inert fallback has no startsAt,
    // and the query it would belong to is never sent.
    orderBy: areBookingsConfigured
      ? [{ startsAt: 'DescNullsLast' }]
      : undefined,
    recordGqlFields: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      isFullDay: true,
      isCanceled: true,
      location: true,
      conferenceLink: true,
    },
    skip: !areBookingsConfigured || calendarEventIds.length === 0,
  });

  const calendarEventPermissions = useObjectPermissionsForObject(
    calendarEventObjectMetadataItem.id,
  );

  const notes = useMemo(
    () =>
      buildNativeSourceState<ClientRecordNote>({
        isConfigured: areNotesConfigured,
        // Either object being unreadable makes the stream an authorisation
        // answer: a junction a role may read, pointing at notes it may not, is
        // not a client with no recorded action.
        canRead:
          noteTargetPermissions.canReadObjectRecords &&
          notePermissions.canReadObjectRecords,
        hasError: isDefined(noteTargetsError) || isDefined(notesError),
        // The second read only starts once the junction has answered, so a
        // junction with no row is already a complete answer.
        isLoading: noteTargetsLoading || (noteIds.length > 0 && notesLoading),
        entries: noteRecords.map(readClientRecordNote),
      }),
    [
      areNotesConfigured,
      noteTargetPermissions.canReadObjectRecords,
      notePermissions.canReadObjectRecords,
      noteTargetsError,
      notesError,
      noteTargetsLoading,
      notesLoading,
      noteIds,
      noteRecords,
    ],
  );

  const bookings = useMemo(
    () =>
      buildNativeSourceState<ClientBooking>({
        isConfigured: areBookingsConfigured,
        canRead:
          calendarEventTargetPermissions.canReadObjectRecords &&
          calendarEventPermissions.canReadObjectRecords,
        hasError:
          isDefined(calendarEventTargetsError) ||
          isDefined(calendarEventsError),
        isLoading:
          calendarEventTargetsLoading ||
          (calendarEventIds.length > 0 && calendarEventsLoading),
        entries: calendarEventRecords.map(readClientBooking),
      }),
    [
      areBookingsConfigured,
      calendarEventTargetPermissions.canReadObjectRecords,
      calendarEventPermissions.canReadObjectRecords,
      calendarEventTargetsError,
      calendarEventsError,
      calendarEventTargetsLoading,
      calendarEventsLoading,
      calendarEventIds,
      calendarEventRecords,
    ],
  );

  return {
    // No separate stream to read: a form response IS a note here, so these
    // items reach the record through `notes` above. Reported as held in the
    // notes rather than as pending or empty.
    formResponses: { kind: 'recorded-in-notes' },
    bookings,
    notes,
  };
};
