import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { buildClientContextEntries } from '@/client-context/utils/buildClientContextEntries';

const buildProvenance = () => ({
  sourceId: 'forms',
  sourceLabel: 'Forms',
  externalId: 'external-1',
  receivedAt: '2026-10-29T10:00:00.000Z',
});

const buildFormResponse = (
  response: Partial<ClientFormResponse>,
): ClientFormResponse => ({
  id: 'response-1',
  formTitle: 'Contact request',
  submittedAt: '2026-10-28T09:00:00.000Z',
  answers: [],
  provenance: buildProvenance(),
  syncStatus: 'confirmed',
  syncReason: null,
  ...response,
});

const buildBooking = (booking: Partial<ClientBooking>): ClientBooking => ({
  id: 'booking-1',
  title: 'Discovery call',
  startsAt: '2026-10-30T14:00:00.000Z',
  endsAt: '2026-10-30T14:30:00.000Z',
  isFullDay: false,
  isCanceled: false,
  location: null,
  conferenceLabel: null,
  conferenceUrl: null,
  attendees: [],
  providerState: null,
  provenance: buildProvenance(),
  syncStatus: 'pending',
  syncReason: null,
  ...booking,
});

const buildNote = (note: Partial<ClientRecordNote>): ClientRecordNote => ({
  id: 'note-1',
  title: 'Qualified from a collection',
  createdAt: '2026-10-29T08:00:00.000Z',
  updatedAt: '2026-10-29T08:00:00.000Z',
  bodyPreview: '',
  provenance: buildProvenance(),
  syncStatus: 'confirmed',
  syncReason: null,
  ...note,
});

const read = <TEntry>(entries: TEntry[]): ClientContextSourceState<TEntry> => ({
  kind: 'read',
  entries,
});

const RECORDED_IN_NOTES = { kind: 'recorded-in-notes' } as const;

describe('buildClientContextEntries', () => {
  it('merges the three sources that answered, newest first', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({})]),
      bookings: read([buildBooking({})]),
      notes: read([buildNote({})]),
    });

    expect(chronology.entries.map((entry) => entry.key)).toEqual([
      'booking:booking-1',
      'note:note-1',
      'form-response:response-1',
    ]);
    expect(chronology.entryCount).toEqual({ status: 'exact', value: 3 });
    expect(chronology.unreadSourceKinds).toEqual([]);
  });

  it('places a note by when it was recorded, not by when it was edited', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([]),
      bookings: read([]),
      notes: read([
        buildNote({
          id: 'old-note-edited-late',
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-31T08:00:00.000Z',
        }),
        buildNote({ id: 'recent-note', createdAt: '2026-10-20T08:00:00.000Z' }),
      ]),
    });

    expect(chronology.entries.map((entry) => entry.id)).toEqual([
      'recent-note',
      'old-note-edited-late',
    ]);
  });

  it('keys an entry by source and id, so three sources cannot collide', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({ id: 'shared' })]),
      bookings: read([buildBooking({ id: 'shared' })]),
      notes: read([buildNote({ id: 'shared' })]),
    });

    expect(new Set(chronology.entries.map((entry) => entry.key)).size).toBe(3);
  });

  // The defect this guards against: a source that said nothing being reported
  // as a record with nothing on it.
  it('reports an unknown number of entries when no source answered', () => {
    const chronology = buildClientContextEntries({
      formResponses: { kind: 'denied' },
      bookings: { kind: 'denied' },
      notes: { kind: 'denied' },
    });

    expect(chronology.entries).toEqual([]);
    expect(chronology.entryCount).toEqual({
      status: 'unavailable',
      value: null,
    });
    expect(chronology.entryCount.value).not.toBe(0);
    expect(chronology.unreadSourceKinds).toEqual([
      'form-response',
      'booking',
      'note',
    ]);
  });

  // Form responses are recorded as notes, so that stream holds no entry of its
  // own. It is not a gap, and counting it as one would keep the figure partial
  // for ever.
  it('does not count the form stream as unread when it is held in the notes', () => {
    const chronology = buildClientContextEntries({
      formResponses: RECORDED_IN_NOTES,
      bookings: read([buildBooking({})]),
      notes: read([buildNote({})]),
    });

    expect(chronology.unreadSourceKinds).toEqual([]);
    expect(chronology.entryCount).toEqual({ status: 'exact', value: 2 });
  });

  it('keeps a figure partial, and attributable, when a source is missing', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({})]),
      bookings: { kind: 'unreadable', problem: 'unexpected-shape' },
      notes: { kind: 'not-configured' },
    });

    expect(chronology.entryCount).toEqual({ status: 'partial', value: 1 });
    expect(chronology.unreadSourceKinds).toEqual(['booking', 'note']);
  });

  it('does not treat a loading source as an empty one', () => {
    const chronology = buildClientContextEntries({
      formResponses: { kind: 'loading' },
      bookings: { kind: 'loading' },
      notes: { kind: 'loading' },
    });

    expect(chronology.entryCount.status).not.toBe('exact');
    expect(chronology.entryCount.value).toBeNull();
  });

  it('puts undated and unreadable instants after every dated entry', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([
        buildFormResponse({ id: 'undated', submittedAt: null }),
        buildFormResponse({ id: 'unreadable', submittedAt: 'not a date' }),
        buildFormResponse({ id: 'dated' }),
      ]),
      bookings: read([]),
      notes: read([]),
    });

    expect(chronology.entries.map((entry) => entry.id)).toEqual([
      'dated',
      'undated',
      'unreadable',
    ]);
  });
});
