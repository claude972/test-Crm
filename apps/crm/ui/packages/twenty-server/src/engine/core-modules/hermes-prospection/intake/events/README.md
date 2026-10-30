# Forms and Cal.diy authenticated bridge ingress

## Verified sources

The imported Forms application is **HeyForm**, not Formbricks. Its native `apps/crm/form/packages/server/src/apps/webhook.ts` function `webhookPayload` sends `{id,formId,formName,fields,answers,hiddenFields,variables,ip?}`. Its app declares no authentication, and native submission timestamps are not included. `mapHeyFormSubmission` maps explicit operator-selected answer IDs to contact fields, rejects duplicate/non-text identities, omits non-text answers and IP/hidden-field/variable data, and uses the bridge-observed receipt timestamp. It never guesses identity from question titles.

Cal.diy is absent from the tracked application tree. Read-only source inspection of the preserved import, whose audited upstream revision is `56da01b4b1664894b784aca636eccab0c56cc141`, verified `packages/features/webhooks/lib/sendPayload.ts` and `factory/versioned/v2021-10-20/BookingPayloadBuilder.ts`. Its default payload is `{triggerEvent,createdAt,payload}`; accepted `BOOKING_CREATED` carries `payload.uid,status,title,startTime,endTime,attendees`. Native Cal signatures are HMAC-SHA256 over the raw body, header `X-Cal-Signature-256`, plus `X-Cal-Webhook-Version`. This ingress **does not pretend to validate that native header**. It requires a controlled bridge which validates the provider source first, maps the supported version, then signs its normalized envelope. Custom templates and other versions are not supported. `mapCalDiyBooking` requires one explicitly selected attendee email; it never chooses the organizer or guesses among attendees.

## HTTP contract

POST `/webhooks/hermes/forms/:connectionId` or `/webhooks/hermes/calendar/:connectionId`, `Content-Type: application/json`, raw body at most 64,000 bytes. Configuration is the existing private `HERMES_INTAKE_CONNECTIONS` map; each connection binds a workspace and actual delegated administrator. Use separate connection credentials per provider. Same HMAC protocol as intake:

`v1\n<connectionId>\n<unix-seconds>\n<UUIDv4 nonce>\n` followed by the exact JSON bytes, signed with the 32-byte hex secret. Header `x-hermes-signature` is `v1=<hex digest>`; timestamp/nonce headers are `x-hermes-timestamp` and `x-hermes-nonce`. TTL is 300 seconds, constant-time comparison, native atomic Redis nonce/rate enforcement, fail closed. A fresh nonce is required for retry; the stable eventId ensures durable semantic idempotence. Strict distinct provider schemas prevent a signed payload being accepted on the other route or on the scraping route. No workspace identity is accepted in the body.

The common strict envelope is `{version:'hermes-bridge-v1',provider,eventId,occurredAt,contact,event}`. Contact is `{email,firstName?,lastName?,companyName?}`. Forms provider is `HEYFORM`; event is `{type:'SUBMISSION_RECEIVED',formId,formName,summary}`. Calendar provider is `CAL_DIY`; event is `{type:'BOOKING_CREATED',bookingUid,status:'ACCEPTED',title,startsAt,endsAt,location?}`. Timestamps require timezone-qualified ISO datetimes, end after start. The mappers return validated envelopes. A bridge must preserve its first receipt timestamp and normalized envelope across retries.

The response contains `{personId,noteId,calendarEventId,replay,marketingConsentGranted:false}`. It never includes configuration or message payloads. Invalid authentication is 401, invalid payload 400, revoked operator 403, ambiguous/archived/suppressed contact or conflicting replay 409, unavailable security configuration/cache 503.

## Native persistence and authorization

The real fresh native access guard checks the delegated operator's active membership, enabled/nondeleted user, active/nondeleted workspace and unrestricted administrator role, before the first native query and again inside the transaction. Native role permission configuration remains attached to every repository. A system ORM context only selects the server-bound workspace; it does not confer a caller-selected workspace or bypass the explicit guard/role permissions.

Inside a native workspace transaction, a parameterized PostgreSQL advisory lock serializes this ingress's upserts per workspace. Contact lookup includes archived records and additional emails; ambiguous/archived people or companies require review. Existing fields and company associations are never silently overwritten. Native email suppression is checked before any insertion and on replay; receipt is not a consent signal and cannot reactivate a suppressed contact.

The transaction creates/reuses native Person and optional Company, creates a native Note with truthful provider/receipt provenance, and links native NoteTarget to contact/company. An accepted booking additionally creates native CalendarEvent and CalendarEventTarget; attendance, email delivery and marketing qualification are not inferred. Native notes/relations and ORM events are used; no artificial TimelineActivity is invented. No new table or campaign qualification is created.

Workspace/connection/provider/eventId generate a deterministic note UUID. Its bounded markdown carries a SHA256 digest of the normalized envelope. Replays recheck archived contact, suppression and note target; changed payloads/edited or archived receipts require review. Transactions provide all-or-nothing persistence. The lock coordinates these Forms/calendar handlers; another existing CRM writer can still race on semantic email equality because the CRM has no demonstrated unique-email constraint. No global uniqueness claim is made.

## Wiring and verification

`HermesEventsModule` is imported by `HermesIntakeModule`; it needs the exported `HermesProspectionAccessService` (root commit `ee2834085`) and native workspace/role/emailing dependencies. No new secrets, services or migration are required.

Eleven real-loopback Nest HTTP tests passed for native-service fixtures: contact/note relations and retries, A/B isolation, distinct submissions for one email, payload conflict, signature and workspace injection, role revocation, suppression/archive, native accepted calendar creation, replay and transaction rollback, and provider mapping rejection. Persistence, ACL and Redis are fixtures; no real SQL, Redis, provider or prospect was contacted. Root CI must still compile the full server and validate native persistence against its disposable database. **The provider-side bridge is not installed or configured by this change**, so live Forms or Cal synchronization is not claimed complete.
