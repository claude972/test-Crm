import { type HermesIntakeReadState } from '@/prospection/types/HermesIntakeState';

// The single seam between this surface and the automatic Hermes intake.
//
// It holds no query on purpose. The entry point's contract is not published,
// so there is no operation to call; calling a guessed one would turn a missing
// contract into a GraphQL error, and the screen would then report a broken or
// unauthorised entry point where the truth is that the client has nothing to
// ask yet. 'awaiting-contract' says that, and says it about the client rather
// than about the workspace.
//
// Publishing the contract is a change to this file alone: replace the constant
// with the query, reduce its GraphQLJSONObject payload the way
// readHermesPayload.ts already reduces hermesImportBatches, and map a refusal
// through readHermesCallFailure onto 'denied' / 'unreadable'. Every consumer
// already renders the six states.
export const useHermesIntakeState = (): HermesIntakeReadState => ({
  kind: 'awaiting-contract',
});
