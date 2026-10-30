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

## Evolution 2.3.6

Primary source pinned to official tag commit `3454bec79f514995df9a5ea36a3554ab35cf1c82`:

- [send router](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/sendMessage.router.ts): POST `/message/sendMedia/{instance}` and `/message/sendWhatsAppAudio/{instance}`.
- [send DTO](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/dto/sendMessage.dto.ts): image/video `number,mediatype,mimetype,caption,fileName,media`; voice `number,audio`. Base64 remains solely in the server→provider request.
- [chat router](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/chat.router.ts) and [chat DTO](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/dto/chat.dto.ts): POST `/chat/getBase64FromMediaMessage/{instance}` with `{message:{key:{id,remoteJid,fromMe}},convertToMp4:false}` retrieves the authenticated provider's stored bytes. Webhook media URLs/keys are never fetched or accepted as storage locators.
- [root version](https://github.com/EvolutionAPI/evolution-api/blob/3454bec79f514995df9a5ea36a3554ab35cf1c82/src/api/routes/index.router.ts): media send requires reported version exactly 2.3.6 and an open connection. Version mismatch fails before a media POST; text v1 remains compatible.

Authenticated webhook images/video/audio are stored through native quarantine and then ingested into the provider ledger. Missing media causes retryable ingestion failure, not a false received acknowledgement. Direct canonical phone/LID mapping rules remain unchanged. Media is excluded from MCP auto/draft analysis; no capability to understand a picture/voice is inferred.

The current runtime provider/webhook ingress/voice conversion is unconfigured and untested live. `canReceiveMedia` and `canRecordVoice` remain false until runtime capability is demonstrated. `canSendMedia` remains false unless the actual probe verifies exact version+open connection. Rich-email capability remains owned by the mail implementation. Unit/loopback tests are not provider delivery proof.

## Migration and evidence

The dedicated `Hermes media migration` GitHub workflow has read-only repository permissions and only uses a fresh GitHub-hosted PostgreSQL/Redis fixture. It compiles exact baseline baece3a and the feature, invokes native `generate:instance-command --name add-hermes-media --type fast --version 2.52.0`, and publishes a patch artifact; it never auto-commits, deploys or uses account secrets. The script rejects local/original databases and unrelated SQL, then tests up/down/up and full baseline/feature metadata convergence, scoped lookup, native workspace cascade and eight-connection atomic asset reservation.

Until that workflow succeeds and its generated patch is applied/rebuilt, no migration or production typecheck/PG result is claimed. A frontend preview is supplied only by the integration owner after that review.
