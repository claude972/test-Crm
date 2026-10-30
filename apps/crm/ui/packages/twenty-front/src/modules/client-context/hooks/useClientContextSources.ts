import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { useDoObjectMetadataItemsExist } from '@/object-metadata/hooks/useDoObjectMetadataItemsExist';

type UseClientContextSourcesArgs = {
  recordId: string;
  objectNameSingular: string;
};

type ClientContextSources = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
  notes: ClientContextSourceState<ClientRecordNote>;
};

// The single seam between a client record and its three context streams.
//
// It holds no query, and it holds no HTTP client.
//
// No query, because no contract is published for which Forms responses,
// CalendarEvents and Notes belong to a client's Hermes context, nor for the
// provenance and sync state each of them must carry. Calling a guessed
// operation would turn a missing contract into a GraphQL error and the record
// would report a refusal or a breakdown where the truth is that the client has
// nothing to ask yet.
//
// No HTTP client, because appointments and recorded actions arrive through the
// NATIVE CalendarEvent and Note objects. Nothing here calls a booking API or a
// forms API from the browser.
//
// What it does do already: it distinguishes 'not-configured' from
// 'awaiting-contract' for the two native streams. The objects may be absent
// from a workspace — the three tables are not assumed to exist in preview — and
// in that case the stream is not pending a contract, it is simply not set up.
// Checked through metadata rather than by querying, because the record hooks
// throw on an object the workspace does not have.
//
// Publishing the contracts is a change to this file alone: replace each
// constant with its read, reduce the payload defensively the way
// readHermesPayload.ts reduces hermesImportBatches, and map a refusal onto
// 'denied' / 'unreadable'. Every component below already renders the six states.
export const useClientContextSources = ({
  recordId: _recordId,
  objectNameSingular: _objectNameSingular,
}: UseClientContextSourcesArgs): ClientContextSources => {
  const doNativeContextObjectsExist = useDoObjectMetadataItemsExist([
    CoreObjectNameSingular.CalendarEvent,
    CoreObjectNameSingular.Note,
  ]);

  const nativeState = doNativeContextObjectsExist
    ? ({ kind: 'awaiting-contract' } as const)
    : ({ kind: 'not-configured' } as const);

  return {
    formResponses: { kind: 'awaiting-contract' },
    bookings: nativeState,
    notes: nativeState,
  };
};
