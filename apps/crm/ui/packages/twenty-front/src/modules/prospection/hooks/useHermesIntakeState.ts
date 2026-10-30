import { type HermesIntakeReadState } from '@/prospection/types/HermesIntakeState';

// The single seam between this surface and the automatic Hermes intake.
//
// It holds no query, and it holds no HTTP client either.
//
// No query, because the GraphQL operation that would expose the entry point
// state is not published. Calling a guessed one would turn a missing contract
// into a GraphQL error, and the screen would report a broken or unauthorised
// entry point where the truth is that the client has nothing to ask yet.
//
// No HTTP client, because the intake itself —
// POST /webhooks/hermes/intake/:connectionId, HMAC plus nonce with a TTL,
// delegated per structure — is server to server. The browser is not a party to
// it, cannot sign a request for it, and must never hold the secret that would
// let it. So there is nothing here that posts, retries or tests it.
//
// Publishing the query is a change to this file alone: read it, reduce its
// GraphQLJSONObject payload the way readHermesPayload.ts already reduces
// hermesImportBatches, and map a refusal through readHermesCallFailure onto
// 'denied' / 'unreadable'. Every consumer already renders the six states.
export const useHermesIntakeState = (): HermesIntakeReadState => ({
  kind: 'awaiting-contract',
});
