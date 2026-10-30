# Contracts the frontend needs, and why

Published rather than guessed. Every screen below is built and reachable; each
one currently reports an honest "awaiting contract" state instead of calling an
operation that does not exist, because a guessed operation turns a missing
contract into a GraphQL error and reads to the user as a broken feature.

Shared conventions, taken from the four published Hermès operations so these
stay consistent with what already works:

- Return `GraphQLJSONObject` with `version: 1`. A payload whose version differs
  is read as unknown, never as empty.
- Carry an explicit `configured: boolean`. Without it, "nothing is set up" and
  "the answer could not be read" collapse into one state, and the screen would
  have to guess which it is.
- Workspace comes from the authenticated session. The client never sends a
  workspace id, and never will.
- Same authorisation policy as `hermesImportBatches`: live workspace members
  with unrestricted administrator role; API keys, apps and impersonated
  sessions refused. `FORBIDDEN` is rendered as a refusal, not as an error.
- **No secret, API key, HMAC key or base URL in any payload.** The frontend
  displays none of these and must not receive them.

## A — automatic intake endpoint state

Proposed: `hermesIntakeEndpoint`, no argument.

```
{
  version: 1,
  configured: boolean,
  endpoint: null | {
    id: string | null,
    label: string | null,            // server wording, never parsed client-side
    isAccepting: boolean | null,     // null = not stated; never rounded to true
    lastCollectionAt: string | null, // ISO 8601; null = never
    providerState: string | null,    // folded diagnostic, untrusted text
    errorCode: string | null
  }
}
```

The endpoint itself is `POST /webhooks/hermes/intake/:connectionId`, server to
server, authenticated by strong HMAC with a nonce TTL and delegated per
structure. The browser never calls it and never holds its secret. This query
exists only so the screen can say whether an entry point exists for this
structure, whether it is accepting, and when it last received something.

## B — collection origin

One additive field on the already published `HermesImportBatch`:

```
origin: 'automatic' | 'manual-json' | null
```

Without it every collection reads "Origin not published", which is the honest
state today. The origin is deliberately not inferred from `createdByUserId` or
from the presence of a `sourceUrl`; a test locks that refusal.

## C — form responses on a record

HeyForm is the source (an EarlyBird fork under `apps/crm/form`), not Formbricks.

`hermesClientFormResponses(input: { recordId: ID!, objectNameSingular: String! })`

```
{
  version: 1,
  configured: boolean,
  responses: [{
    id: string,                      // required; a response without one is dropped and counted
    formTitle: string | null,
    submittedAt: string | null,      // when the respondent sent it
    answers: [{ id, label: string|null, value: string|null }] | null,
                                     // null = unreadable; [] = a submission with no answer.
                                     // These are not the same and must not be merged.
    source: { id, label, externalId, receivedAt },
                                     // receivedAt = when THIS workspace received it,
                                     // distinct from submittedAt
    sync: { status: 'not-configured'|'pending'|'confirmed'|'failed'|'unavailable',
            reason: string | null }
  }]
}
```

## D — bookings on a record

Cal.diy, reached through the audited upstream protocol. The bridge and the
native `Note` / `CalendarEvent` attachment are owned elsewhere; this query is
what a record page reads.

`hermesClientBookings(input: { recordId: ID!, objectNameSingular: String! })`,
same envelope, with:

```
bookings: [{
  id: string,
  title: string | null,
  startsAt: string | null,
  endsAt: string | null,
  providerState: string | null,  // provider wording, shown as diagnostic,
                                 // never promoted into sync.status
  attendeeEmail: string | null,  // as the source recorded it; nothing is reconciled here
  source: { id, label, externalId, receivedAt },
  sync: { status: …, reason: string | null }
}]
```

### Two hard requirements on C and D

1. `sync.status` must separate `pending` — this workspace holds the item
   locally — from `confirmed` — the provider confirmed it. The frontend will
   never derive `confirmed` from the mere presence of a row.
2. Only items **actually received** may appear. The server must not synthesise
   a row from a link or from a configuration. `docs/decisions.md:7` already
   records that Forms and the booking app are separate applications offering
   navigation, not synchronisation, and the integration contract says a link is
   not an integration.

One decision is still open and is not the frontend's to take: **who may read a
client's form responses**. The screen renders `denied` on `FORBIDDEN`.
