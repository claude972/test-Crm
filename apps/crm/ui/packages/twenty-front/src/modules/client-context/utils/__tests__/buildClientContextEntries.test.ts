import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
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
  providerState: 'accepted',
  attendeeEmail: 'someone@example.com',
  provenance: buildProvenance(),
  syncStatus: 'pending',
  syncReason: null,
  ...booking,
});

const read = <TEntry>(entries: TEntry[]): ClientContextSourceState<TEntry> => ({
  kind: 'read',
  entries,
});

describe('buildClientContextEntries', () => {
  it('merges the sources that answered, newest first', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({})]),
      bookings: read([buildBooking({})]),
    });

    expect(chronology.entries.map((entry) => entry.key)).toEqual([
      'booking:booking-1',
      'form-response:response-1',
    ]);
    expect(chronology.entryCount).toEqual({ status: 'exact', value: 2 });
    expect(chronology.unreadSourceKinds).toEqual([]);
  });

  it('keys an entry by source and id, so two sources cannot collide', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({ id: 'shared' })]),
      bookings: read([buildBooking({ id: 'shared' })]),
    });

    expect(new Set(chronology.entries.map((entry) => entry.key)).size).toBe(2);
  });

  // The defect this guards against: a source that said nothing being reported
  // as a record with nothing on it.
  it('reports an unknown number of entries when no source answered', () => {
    const chronology = buildClientContextEntries({
      formResponses: { kind: 'awaiting-contract' },
      bookings: { kind: 'awaiting-contract' },
    });

    expect(chronology.entries).toEqual([]);
    expect(chronology.entryCount).toEqual({
      status: 'unavailable',
      value: null,
    });
    expect(chronology.entryCount.value).not.toBe(0);
    expect(chronology.unreadSourceKinds).toEqual(['form-response', 'booking']);
  });

  it('keeps a figure partial, and attributable, when one source is missing', () => {
    const chronology = buildClientContextEntries({
      formResponses: read([buildFormResponse({})]),
      bookings: { kind: 'unreadable', problem: 'unexpected-shape' },
    });

    expect(chronology.entryCount).toEqual({ status: 'partial', value: 1 });
    expect(chronology.unreadSourceKinds).toEqual(['booking']);
  });

  it('does not treat a loading source as an empty one', () => {
    const chronology = buildClientContextEntries({
      formResponses: { kind: 'loading' },
      bookings: { kind: 'loading' },
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
    });

    expect(chronology.entries.map((entry) => entry.id)).toEqual([
      'dated',
      'undated',
      'unreadable',
    ]);
  });
});
