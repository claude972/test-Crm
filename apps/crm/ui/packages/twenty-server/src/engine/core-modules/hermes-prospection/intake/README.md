# Automatic Hermes intake — real signed staging webhook

POST `/webhooks/hermes/intake/:connectionId`, Content-Type application/json. This endpoint receives scraped data from a configured producer; it does not run a scraper, qualify people, create campaigns or send messages. The existing authenticated reception displays the staged results. Root registers HermesIntakeModule in CoreEngineModule. Existing HermesProspectionModule exports its guarded staging service; no JWT is fabricated or accepted instead of the signature.

## Private operator configuration

`HERMES_INTAKE_CONNECTIONS` is a sensitive server-only JSON map, default `{}`. Each UUID connection key maps to `{workspaceId,operatorUserId,operatorUserWorkspaceId,secret,enabled?,maxRequestsPerMinute?}`. All three identities are UUIDs. The secret is64 lowercase hex characters generated from32 cryptographically random bytes, not a password or shared key; duplicate secrets across connections are refused. Enabled defaults true and rate defaults10/min (allowed1–60). No secret or instance-wide fallback enters the browser. An unknown/disabled connection returns a generic401. Invalid server config returns a generic503 without values.

The operator is a real, explicitly delegating native account. The existing staging service rechecks its live membership, enabled/non-deleted user, ACTIVE/non-deleted workspace and unrestricted administrator role before reading or writing. Revocation therefore stops automation. createdByUserId records that delegating account, not a fabricated bot user. This grant is staging-only: the public route has no qualification, campaign or delivery operation.

## Signed wire protocol v1

Headers: `x-hermes-timestamp` = Unix seconds (10 decimal digits); `x-hermes-nonce` = fresh UUIDv4; `x-hermes-signature` = `v1=` followed by lowercase HMAC-SHA256 hex. The HMAC key is the bytes decoded from the configured hex secret. Hash these exact bytes:

```
v1\n<connectionId>\n<timestamp>\n<nonce>\n<raw UTF-8 JSON bytes>
```

Timestamp skew is at most300 seconds in either direction. Signature comparison is constant-time. Body max2000000 bytes, UTF-8 JSON object, no unknown root or row fields. Native DTO validators additionally enforce provenance URL/date and field bounds. Body:

```json
{
  "externalBatchId": "producer-stable-batch-id",
  "name": "Directory batch",
  "sourceUrl": "https://example.test/directory",
  "collectedAt": "2026-10-30T12:00:00.000Z",
  "rows": [
    {
      "email": "person@example.test",
      "companyName": "Example",
      "firstName": "Synthetic"
    }
  ]
}
```

One–100 rows. Required string row fields email/companyName may be blank and become native invalid rows; optional fields firstName/lastName/jobTitle/website/phone follow the existing DTO. No workspace/operator IDs, sender settings or secret may appear in the body. Source URLs are metadata only, never fetched.

Raw externalBatchId max91 characters: the server prefixes `<connectionId>:` to create a128-character maximum native ID. This preserves machine provenance and isolates idempotency between connections, including connections targeting the same workspace. The native canonical content fingerprint, row validation/deduplication, durable suppressions,40-batch/2 MB workspace state limits and transactional locking remain authoritative.

Redis atomically claims the signed nonce and connection rate slot. Replay keys expire after601 seconds, covering the full future-skew acceptance window. There is no process-local replay fallback. Missing/failing Redis returns503 and stages nothing. Reusing the exact nonce returns409. After timeout or uncertain network response, sign a **new nonce/timestamp** with the same stable externalBatchId/content: native staging returns the same batch ID and replay=true. Changing content under the same namespaced ID conflicts. Rate refusal returns429.

A successful200 returns `{batchId,externalBatchId,replay,rowCount,intakeConnectionId,qualificationRequired:true}`. The response contains no contact rows or keys. It does not mean contacts were qualified or that a campaign was sent. Qualification remains the existing human-authorized action.

## Verification

15 tests passed, including a real ephemeral Nest HTTP listener on loopback. They exercise valid HMAC ingestion, forged/tampered/expired requests rejected before staging, body actor/tenant override rejection, server-bound A/B isolation, exact nonce replay, fresh-nonce idempotent retry, concurrent retry, suppressed/invalid rows, delegated-operator refusal and size/count/ID limits. Persistence, authority and replay dependencies are isolated fixtures; no local SQL/Redis daemon, real producer or prospect was contacted. The Redis test verifies the actual atomic eval call and fail-closed behavior; production PostgreSQL/Redis behavior remains a disposable CI integration check. Root must build/typecheck and expose this module before an endpoint is claimed deployed.

## Hermes MCP capability discovery

No active Hermes-specific MCP client, endpoint or tool configuration was established from repository source/docs. Old `packages/twenty-server/dist/modules/bot` files are historical artifacts, not active integration evidence. The native `/mcp` implementation is this CRM's own inbound MCP server. It must not be advertised as an external Hermes reply bot. The separate messaging adapter contract is draftReply({workspaceId,conversationId,messageId,text,channel}) returning MANUAL/NOT_CONFIGURED unless a verified, operator-configured MCP draft tool is available; no dispatch belongs to that adapter.

## Provider capabilities

Connections may set server-only `allowedSources` to a nonempty subset of `SCRAPING`, `FORMS`, `CALENDAR`; the default is `['SCRAPING']`. The staging endpoint requires SCRAPING and cannot upgrade a Forms/calendar-only key. Native-contact event endpoints require their explicit source. Use distinct credentials per provider. See `events/README.md` for the normalized signed bridge protocol; raw unsigned Forms webhooks are never accepted.

## Browser status query (metadata GraphQL)

`hermesIntakeState` has **no arguments** and uses the authenticated current workspace. Only a standard non-impersonated user session is accepted; fresh native unrestricted-admin authorization runs before any private configuration or history read. Other workspace connections are filtered out. Invalid private configuration returns a generic CONFIGURATION_ERROR with no raw diagnostic. No credential, operator identity, signature, nonce or TTL is returned.

```graphql
query HermesIntakeState {
  hermesIntakeState {
    status checkedAt errorCode
    endpoints {
      connectionId structureId structureName label isAccepting
      lastCollectionAt providerState errorCode
      sources {
        source relativeEndpoint humanQualificationRequired
        nativeContactCreationEnabled
      }
    }
  }
}
```

Top-level status is NOT_CONFIGURED (no mapping for this workspace), CONFIGURED_UNVERIFIED (mapping exists), or CONFIGURATION_ERROR. Each endpoint providerState is CONFIGURED_UNVERIFIED or DISABLED. `isAccepting` is null for an enabled mapping and false for a disabled mapping; this query performs no Redis, provider, bridge or HTTP probe and never reports true. Source is SCRAPING/FORMS/CALENDAR. Paths are relative server routes; browsers must not invoke or sign them. `nativeContactCreationEnabled` reports policy authorization only, not tested provider readiness. SCRAPING always requires human qualification; Forms/calendar do not grant campaign qualification or marketing consent.

New batches carry an optional server-attested `origin`: `{kind:'MANUAL'}` or `{kind:'SIGNED_INTAKE',connectionId,receivedAt}`. Historical batches have no origin. Only the HMAC-authenticated intake service supplies the internal provenance parameter; GraphQL input DTOs expose no such field. Origin is set on creation only; replay cannot upgrade a manual/historical batch or overwrite an existing receipt. lastCollectionAt is the latest matching SIGNED_INTAKE.receivedAt in the authorized workspace's durable batch state. A caller-chosen externalBatchId prefix, URL, createdByUserId, or provider collectedAt is never used as evidence of automatic receipt. Forms/calendar receipts are native Notes, so this field is not their last-receipt time.
