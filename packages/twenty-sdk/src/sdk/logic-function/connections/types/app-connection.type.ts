// One credential the running app owns. Returned from `listConnections` and
// `getConnection`. The server refreshes `accessToken` on read, so the value
// is always usable at the moment the helper resolves.
//
// The shape lives in kovaa-lab-shared so this re-export and the server-side
// `AppConnectionDto` always agree — changes propagate to both at once.
export type { AppConnection } from 'kovaa-lab-shared/application';
