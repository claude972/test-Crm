# Hermes V4 — central connections (D)

Branch `feat/codex-hermes-v4-connections`, base `baece3a46a6286a933cfc99b22a53ac50c34e498`. Implementation checkpoint; not evidence of configured providers. Entity requires the official instance migration before runtime integration. No migration is generated concurrently with B. Native rotation registry includes the encrypted configuration as a workspace-scoped column site.

## GraphQL metadata

Standard tenant-bound user sessions only; no API key, application, impersonation or anonymous access. Current unrestricted workspace administrators only. Workspace/user/membership are derived from the authenticated session, never accepted in inputs.

- Query `hermesConnectionsV4: [JSONObject!]!` returns one view per EVOLUTION/MAIL/MCP/INTAKE: `{kind,connectionId,revision,state,settings,secretFields,updatedAt}`. State is NOT_CONFIGURED or CONFIGURED_UNVERIFIED. Configuration presence is never a connection test. No secret value, ciphertext or secret suffix is returned. `secretFields` contains field names only.
- Mutation `hermesSaveConnectionV4(input:HermesConnectionSaveInput!): JSONObject!`. Input `{kind:String!,expectedRevision:Int!,settings:JSONObject!,secrets:JSONObject}`. First save requires expectedRevision0. Subsequent writes require exact latest revision; stale writes fail CONNECTION_REVISION_CONFLICT. Secret object omission retains existing secrets for the same identity. Supplying a secret object replaces the complete secret set. Identity changes require explicitly supplied secrets. Blank strings are invalid, not “keep old password”.
- Mutation `hermesRemoveConnectionV4(input:HermesConnectionScopeInput!): JSONObject!`. Input `{kind,expectedRevision}`. Removal revokes configuration, deletes encrypted payload and keeps a monotone revision tombstone. Recreating generates a new connection ID. The UI must not retry stale mutations automatically.

Settings/secrets by kind:

- EVOLUTION settings `{baseUrl,instanceName}`, secrets `{apiKey,webhookSecret}`. Base URL is a public HTTPS origin without path/query/userinfo; instance name native alphanumeric/underscore/hyphen. Webhook secret exactly64 lowercase hex characters, distinct from apiKey and unique across workspaces, matching the native receiver.
- MCP settings `{endpoint,toolName,protocolVersion:'2025-11-25',argumentMap:{text,conversationId?,messageId?,channel?,workspaceId?}}`, secrets `{token}`. Endpoint public HTTPS without credentials/query/hash; native parser validates tool/unique argument names, token at least32 printable ASCII characters.
- MAIL settings `{connectedAccountId:UUID,mailbox:string}`; no secrets accepted here. This links an existing native ConnectedAccount IMAP_SMTP_CALDAV owned by the configuring administrator, with secure IMAP and SMTP (SSL_TLS or STARTTLS). Native account setup owns the encrypted IMAP/SMTP credentials. Response additionally contains normalized handle. Native account identity/permission changes invalidate the binding until reconfigured. No second mail credential store.
- INTAKE settings `{allowedSources:('SCRAPING'|'FORMS'|'CALENDAR')[],maxRequestsPerMinute:1..60}`, secrets `{secret:64-lowercase-hex}`. Secret is supplied by the operator and never returned; the existing HMAC endpoint/signature protocol remains authoritative. No intake enablement is implied until ingress uses the central reader.

Cross-workspace Evolution instance identity reuse and MCP/intake shared tokens are rejected under a provider lock, preserving native parser isolation.

Every save/removal serializes under the native messaging workspace lock and clears existing AUTO delegation owners for affected channels (Evolution→WhatsApp, MAIL→EMAIL, MCP→both), downgrades local grants to MANUAL and advances conversation/channel policy epochs monotonically. Credential rotation never restores an old grant; a fresh explicit policy action is required.

Saving does not send provider requests, invoke tools or send email/WhatsApp. HTTPS DNS targets are validated by the native SSRF helper before persistence; provider adapters must keep their existing connection-time SSRF/TLS protection. Disallowed or unresolved hosts fail with a sanitized code, never a raw config/secret in GraphQL errors.

## Internal shared reader

`HermesConnectionsModule` is global, exports `HermesConnectionsService` and the same singleton under injection token `HERMES_CONNECTIONS_SERVICE`, and must be imported once by the integration owner. D does not edit other lots' modules. Reader:

`resolve(workspaceId,kind): Promise<null | {connectionId,revision,userId,userWorkspaceId,settings,secrets}>`.

All configuration is native `SecretEncryptionService.encryptVersioned` enc:v2 with workspace AAD. Encrypted envelope also binds provider kind, workspace and configuring membership. Reader rechecks configuring administrator access, MAIL account/identity and final revision. Null means unconfigured/revoked. Errors mean fail closed; adapters must never fall back to legacy environment configuration after a central record exists but fails validation.

MAIL: `settings={connectedAccountId,mailbox,handle}`, `secrets={}`. C compares current `connectionId`/`revision` and account `updatedAt` immediately before IMAP/SMTP effects. B uses EVOLUTION settings/secrets and MCP settings/token solely on the server. Consumers resolve again and compare connection ID/revision before external side effects and before releasing scoped media; rotation increments revision even when identity and ID remain stable. Identity changes rotate connection ID to prevent reusing old conversation/ledger context. D preserves IDs on credential rotation, never on deletion/recreation.

`resolveByConnectionId(connectionId,kind)` performs a server-only webhook lookup and reuses the same grant/identity/revision checks. `workspaceIds(kind)` enumerates enabled scopes for server polling; every use still resolves/rechecks the live grant. This checkpoint does not change existing public webhook routing. No caller-supplied workspace is trusted from request bodies.

## Verification / limits

Targeted unit tests cover native encryption/AAD, secret redaction, CAS, revoke/recreate, identity changes, role revocation after lock wait, in-flight config revision, secure native mailbox binding and public HTTPS validation. No full tsgo local per saturation constraint; cloud typecheck/native PostgreSQL and official2.52 instance migration remain required. No provider is configured or tested live, and no production/original database is touched.
