# HERMES V4 — media contract, checkpoint B

Implementation branch: `feat/codex-hermes-v4-media`, common base `baece3a46a6286a933cfc99b22a53ac50c34e498`. This is an implementation contract, not evidence of a configured/live provider. No real WhatsApp send is authorized by these tests.

## Metadata GraphQL operations

All operations require a standard, tenant-bound user session and the current unrestricted messaging administrator role. No API keys, application sessions, impersonation or anonymous reads. The server derives workspace/user/membership; none are accepted in inputs.

- `hermesPrepareMediaUpload(input: HermesPrepareMediaUploadInput!): HermesMediaUploadTarget!`
  - input: `{conversationId: UUID!, kind: String!, filename: String!, mimeType: String!, size: Int!}`.
  - response: `{assetId: UUID!, uploadUrl: String!, contentType: String!, expiresAt: DateTime!}`.
  - PUT the raw bytes to the native `uploadUrl` using exactly its `contentType`; no multipart/base64. The URL is a native quarantine target, never a provider URL.
- `hermesFinalizeMediaUpload(input: HermesMediaScopeInput!): HermesMediaAsset!`.
- `hermesCancelMediaUpload(input: HermesMediaScopeInput!): Boolean!`.
- `hermesMediaRead(input: HermesMediaScopeInput!): HermesMediaRead!`.
  - scope input: `{conversationId: UUID!, assetId: UUID!}`.
  - asset: `{id,kind,filename,mimeType,size,status}`; no file storage IDs, keys, provider URLs, or base64.
  - read response: `{downloadPath: String!, expiresAt: DateTime!}`. Fetch that relative backend path with the current session Authorization Bearer header, then use a revocable browser blob URL for image/video/audio playback. A bare `<img src=downloadPath>` is insufficient: this route also requires authentication.
- `hermesInboxMessagesV3(input: HermesInboxMessagesInput!): HermesInboxMessagesV3Page!`.
  - pagination/fields remain those of v1. Each message additionally has `kind: String!` and `attachments: [HermesMediaAsset!]!`. A received image/video/audio may have empty text. Query fields explicitly; v1 names and required text replies stay compatible.
- `hermesInboxReplyV3(input: HermesInboxReplyV3Input!): HermesInboxMessageV3!`.
  - input: `{conversationId: UUID!, clientRequestId: UUID!, kind: String!, text: String!, assetId: UUID}`.
  - WhatsApp kinds: TEXT, IMAGE, VIDEO, AUDIO. TEXT needs nonblank text and no assetId. Other kinds need one READY asset matching workspace, conversation, connection, owner and kind. AUDIO needs empty text because the documented voice route has no caption.
  - After timeout/UNCONFIRMED, do not mint another request ID or retry automatically. The original durable request ID returns the original result and never re-emits a provider POST. ACCEPTED is provider acceptance, never delivered/read.

## Lifecycle and formats

Prepare → native upload quarantine → finalize after native magic-byte sniff/size/SHA256 → READY → atomic one-shot ATTACHED in the durable send reservation. Cancel only PENDING/READY; sent assets cannot be cancelled as a draft. Cancellation durably revokes the asset and deletes through the native storage lock/quota mechanism. No temporary browser recording is persisted before the user uploads it.

- IMAGE: JPEG/PNG/WebP, ≤5 MiB.
- VIDEO: MP4, ≤16 MiB.
- AUDIO: Ogg/Opus, MPEG, MP4 audio, WebM audio, ≤16 MiB. Native sniff must agree with declared MIME; incompatible recorder output is rejected, never relabelled.
- FILE (shared email asset service only): PDF/DOCX/XLSX/PPTX, ≤20 MiB, downloaded as attachment. WhatsApp prepare/reply do not accept FILE.
- HTML, SVG, executable formats and unknown MIME are rejected. Client extension/MIME alone never makes a file READY.

Reads use a native FILE token with a 60-second lifetime, bound to the asset, workspace, user and membership, plus a current authenticated session. Every read rechecks current role/membership and conversation/connection scope. Responses stream privately through the backend with no-store/nosniff/CSP; no provider redirect or generic native signed read URL is exposed. Access is rechecked after storage lookup and before returning bytes to the provider.

The internal service offers `cloneForConversation(actor,{sourceConversationId,sourceAssetId,targetConversationId})` for future mail forwarding: it reads through the source scope, verifies the target scope and uploads a new native asset. Cross-thread raw asset ID reuse is not supported. The mail backend owns MIME assembly; generic FILE support alone is not a rich mailbox implementation.

## Mail backend extension (server-only)

`HermesEmailEnvelope`, `HermesEmailReplyInput` and `HermesMessagingAttachment` are exported from `hermes-messaging/types/hermes-messaging.types.ts`.

`messaging.replyEmail(actor,{conversationId,clientRequestId,envelope,attachmentIds})` requires an EMAIL conversation. The envelope is `{from,to:string[],cc:string[],bcc:string[],subject,text,html?,inReplyTo?,references?:string[],inlineAttachments?:{assetId,cid}[]}`. Addresses are plain validated mailbox addresses, no header injection; at most50 combined recipients. The mail service owns authoritative mailbox/verified alias selection, recipient planning, private envelope/HTML/provenance and MIME assembly. Core reserves the same durable request ledger and all assets atomically before SMTP, checks current access again, and passes `send({...base,email:envelope,attachments:[{assetId,kind,mimeType,filename,bytes}]})` solely to the server adapter. Rich send requires probe AVAILABLE with canComposeRichEmail=true. A changed envelope or asset set cannot reuse the original clientRequestId. Bcc/HTML never appear in the inbox GraphQL DTO.

At most10 assets and25MiB total; every ID must be owned/READY in the exact workspace/conversation/connection. One failure rolls back all binds. Inline asset IDs must be a subset of attachmentIds with unique cids matching `[A-Za-z0-9._-]{1,120}`. No CID URL grants file access.

`messaging.ingest({...baseEvent,kind:'EMAIL',attachmentIds})` supports inbound email with multiple assets and empty text, while each asset is first stored using `media.receive({workspaceId,conversationId,providerConnectionId,providerMessageId:'provider-message:part-id',kind,mimeType,bytes}) -> {assetId}`. The distinct part key makes native asset ingestion durable/idempotent. `filename?:string` preserves an inbound mail attachment name after validation. For mailbox reading/backfill, C MUST call the server-only `ingest(event,{suppressAutomation:true,observedOnly:true})`: this never triggers MCP/AUTO and persists status OBSERVED, even for an observed Sent folder entry. The options are not accepted inside event bodies or webhook/client inputs. A later authenticated real send receipt may promote OBSERVED to ACCEPTED; a later observation never demotes accepted evidence. Core uses message `attachmentIds: uuid[]`, never raw provider URLs. Plain email text can still reach MCP under the existing policy; attachments and raw HTML are not supplied to MCP.

`messaging.ensureEmailDraftConversation(actor,{clientRequestId,providerConnectionId,contactHandle,subject})` creates a deterministic MANUAL EMAIL conversation with no fake message. C must derive and validate the active mailbox connection ID before calling it. It returns the native conversation and `providerConversationId=draft:<clientRequestId>`; C retains that canonical key for its draft/UID/Sent/reply associations. Reusing the initialization request with a different destination/subject conflicts. Last activity remains monotone for later historical imports and provider echoes.

MediaRecorder MIME parameters should be removed before prepare. WebM audio is a container: if native magic-byte detection reports video/webm for audio/webm input, finalize retains the authoritative video/webm MIME with kind AUDIO. It never rewrites bytes or labels an unrecognized container as audio.

## Evolution 2.3.6

Primary source pinned to official tag commit `3454bec79f514995df9a5ea36a3554ab35cf1c82`:

- [send router](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/sendMessage.router.ts): POST `/message/sendMedia/{instance}` and `/message/sendWhatsAppAudio/{instance}`.
- [send DTO](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/dto/sendMessage.dto.ts): image/video `number,mediatype,mimetype,caption,fileName,media`; voice `number,audio`. Base64 remains solely in the server→provider request.
- [chat router](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/chat.router.ts) and [chat DTO](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/dto/chat.dto.ts): POST `/chat/getBase64FromMediaMessage/{instance}` with `{message:{key:{id,remoteJid,fromMe}},convertToMp4:false}` retrieves the authenticated provider's stored bytes. Webhook media URLs/keys are never fetched or accepted as storage locators.
- [root version](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/index.router.ts): media send requires reported version exactly 2.3.6 and an open connection. Version mismatch fails before a media POST; text v1 remains compatible.

Authenticated webhook images/video/audio are stored through native quarantine and then ingested into the provider ledger. Missing media causes retryable ingestion failure, not a false received acknowledgement. Direct canonical phone/LID mapping rules remain unchanged. Media is excluded from MCP auto/draft analysis; no capability to understand a picture/voice is inferred.

The current runtime provider/webhook ingress/voice conversion is unconfigured and untested live. `canReceiveMedia` and `canRecordVoice` are no longer hardcoded false: since CJ-03 (`a8fb18b58`) the probe derives them from what the provider actually answers, so they read false here only because no provider answers. `canReceiveMedia` requires an open connection, the exact pinned version, and a webhook row that is enabled, subscribed to `MESSAGES_UPSERT` and pointed at this connection's own ingress path; a failed read reports `WEBHOOK_NOT_READABLE` and is never reported as nothing configured. `canRecordVoice` attests the voice route's presence on a verified build with an open socket, NOT that a clip was converted and delivered — no endpoint on the pinned build reports audio-conversion availability. The webhook host is not asserted, only the path and the connection id, so which host answers is unproven. `canSendMedia` remains false unless the actual probe verifies exact version+open connection. See `docs/handoff/hermes-cj03-whatsapp-media-capability.md` for the full derivation. Rich-email capability remains owned by the mail implementation. Unit/loopback tests are not provider delivery proof.

## Migration and evidence

The dedicated `Hermes media migration` GitHub workflow has read-only repository permissions and only uses a fresh GitHub-hosted PostgreSQL/Redis fixture. It compiles exact baseline baece3a and the feature, invokes native `generate:instance-command --name add-hermes-media --type fast --version 2.52.0`, and publishes a patch artifact; it never auto-commits, deploys or uses account secrets. The script rejects local/original databases and unrelated SQL, then tests up/down/up and full baseline/feature metadata convergence, scoped lookup, native workspace cascade and eight-connection atomic asset reservation.

Until that workflow succeeds and its generated patch is applied/rebuilt, no migration or production typecheck/PG result is claimed. A frontend preview is supplied only by the integration owner after that review.

## Trusted ingestion snapshot guard (internal C/D contract)

Server-only additive options: `ingest(event,{suppressAutomation?,observedOnly?,assertLive?:(manager?:EntityManager)=>Promise<void>})` and `media.receive(input,{assertLive?:(manager?:EntityManager)=>Promise<void>})`. A trusted adapter passes its connection revision/deadline assertion. After the advisory lock, it is called with the **same** transaction manager before writes, after awaited native file stages and before commit; ingestion also checks outside the completed transaction before any AUTO processing. D's manager-aware reader takes the existing workspace messaging advisory lock before a fresh revision read, reentrant when ingestion already owns it. The callback is never a public DTO, provider payload field or GraphQL input.

Four focused tests were red on exact pre-guard source copies: stale-after-lock and post-insert revocation would commit messages; stale-before-file and revocation-during-native-bytes would persist media. The guard implementation passes those cases plus the existing messaging/media/manager regressions (73tests/3suites). C's outer observe deadline and central null/revision checks are a second guard, not a replacement for the transaction checks. No runtime schema or migration delta is added by this API.

### Server-only unsent draft edits

`ensureEmailDraftConversation(actor,input,{allowUnsentUpdate?:boolean,assertLive?:(manager?:EntityManager)=>Promise<void>})` keeps `input.clientRequestId` as stable draft identity, distinct from a later immutable send request id. Default remains strict immutable target/subject. Mail alone may set allowUnsentUpdate after resolving the current mailbox. Under the workspace transaction lock, any PENDING/ACCEPTED/UNCONFIRMED/FAILED outbound reservation blocks all native draft edits. Otherwise contact/subject may change; bot delegation clears and OFF remains OFF. Current contact drives person matching (no stale person id is stored). The trusted current-binding/deadline callback runs before/after writes on the same manager. No public mutation accepts either option. Native IMAP draft replacement/persistence belongs to C.

### MAIL-004 automatic-response provenance

Server-only adapter send input adds optional `automated:true`, derived exclusively from the validated internal botGrant. Public reply/GraphQL objects remain strict and cannot supply this field. Human sends (including approved MCP drafts) omit it. EMAIL event metadata may contain only bounded `mailAutoResponseBlockReason:AUTO_SUBMITTED|NULL_RETURN_PATH|BULK_OR_LIST|DELIVERY_STATUS`; ingest suppresses AUTO before MCP for this reason even if a caller omitted suppressAutomation. Human reads/drafts/replies remain allowed under current policy. C derives the reason from parsed native MIME and adds the RFC3834 Auto-Submitted header only to true delegated automatic SMTP replies. No new entity/DDL.
