import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';

type UseClientContextSourcesArgs = {
  recordId: string;
  objectNameSingular: string;
};

type ClientContextSources = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
};

// The single seam between the client record and its two external sources.
//
// It holds no query on purpose. No contract is published for Forms responses
// or for appointments, so there is nothing to call; calling a guessed
// operation would turn a missing contract into a GraphQL error and the record
// would report a refusal or a breakdown where the truth is that the client has
// nothing to ask yet.
//
// The arguments are taken already, unused, so that publishing a contract is a
// change to this file alone: swap the constants for the two queries, reduce
// each payload defensively the way readHermesPayload.ts reduces
// hermesImportBatches, and map a refusal onto 'denied' / 'unreadable'. Every
// component below already renders the six states.
export const useClientContextSources = ({
  recordId: _recordId,
  objectNameSingular: _objectNameSingular,
}: UseClientContextSourcesArgs): ClientContextSources => ({
  formResponses: { kind: 'awaiting-contract' },
  bookings: { kind: 'awaiting-contract' },
});
