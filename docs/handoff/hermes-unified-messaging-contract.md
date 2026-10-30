# Unified workspace inbox — implementation contract

Metadata API, standard non-impersonated user sessions only. Workspace comes exclusively from the authenticated context. Every operation rechecks live membership and unrestricted workspace administrator role through the existing native access policy; no role/license/admin elevation. This initial beta exposes only explicitly ingested shared connections, never auto-discovers or lists private native mailboxes.

GraphQL fields (all channel/status values are Strings):

```graphql
hermesMessagingConnections: [HermesMessagingConnection!]!
# { channel, state: NOT_CONFIGURED|CONFIGURED_UNVERIFIED|AVAILABLE|UNAVAILABLE,
#   canSend, canSync, lastCheckedAt, errorCode? }
hermesInboxConversations(input: HermesInboxConversationsInput): HermesInboxConversationsPage!
# input { channel?: WHATSAPP|EMAIL, limit?: Int(1..100, default30), cursor?: String }
# page {items:[{id,channel,providerConnectionId,contactHandle,personId?,personMatchStatus,subject?,lastMessageAt}],nextCursor?}
hermesInboxMessages(input: HermesInboxMessagesInput!): HermesInboxMessagesPage!
# input {conversationId:UUID!,limit?:Int(1..100,default50),cursor?:String}
# page {items:[{id,conversationId,channel,direction,text,status,occurredAt,errorCode?,providerMessageId?}],nextCursor?}
hermesInboxReply(input: HermesInboxReplyInput!): HermesInboxMessage!
# input {conversationId:UUID!,clientRequestId:UUID!,text:String!(1..20000)}
hermesInboxDraftReply(input: HermesInboxDraftReplyInput!): HermesInboxDraftReply!
# input {conversationId:UUID!,messageId:UUID!}
# output {mode:MANUAL|DRAFT,status:NOT_CONFIGURED|READY|UNAVAILABLE,provider:HERMES_MCP,text?}
```

Messages newest first; opaque pagination includes timestamp plus ID so equal timestamps do not drop rows. Status RECEIVED comes from an authenticated inbound event; ACCEPTED from a provider receipt/outbound echo, never asserts delivery. UNCONFIRMED is persisted before any outbound network call and never automatically resends the same clientRequestId. Failed pre-transport attempts are FAILED only for explicit safe NOT_CONFIGURED/INVALID_RECIPIENT/SEND_REJECTED codes; unknown outcomes remain UNCONFIRMED. No bot response dispatch occurs: draft proposals require a separate explicit human reply call.

Server interfaces are in `hermes-messaging/types/hermes-messaging.types.ts`: HermesMessagingAdapter (channel, probe, send), HermesMessagingEvent (direction mandatory), HermesMessagingSend (providerConnectionId mandatory), HermesMessagingBotAdapter (draftReply only). Registry HermesMessagingAdapterRegistry.register(adapter) and registerBot(adapter) are exported; duplicate channel registration is refused. Optional HERMES_MESSAGING_ADAPTERS and HERMES_MESSAGING_BOT_ADAPTER DI tokens are exported. Absence means NOT_CONFIGURED, never a synthetic connection. Probe CONFIGURED_UNVERIFIED is distinct from provider-confirmed AVAILABLE; optional canSend/canSync describe allowed operations independently. canSync defaults false.

Trusted internal `HermesMessagingService.ingest(event)` accepts `{workspaceId,channel,direction,providerConnectionId,providerConversationId,providerMessageId,contactHandle,text,occurredAt,subject?}`; adapters authenticate the connection and derive workspace server-side before calling it. No public ingest GraphQL mutation exists. The service also verifies active/nondeleted workspace in the same database transaction as persistence. Printable ASCII provider IDs are bounded at256 characters; adapter may hash longer/untrusted RFC IDs. E-mail contactHandle is one bare validated address; WhatsApp JIDs preserve provider identity, and only direct phone JIDs are candidates for CRM matching.

Durable normalized core storage: core.hermesConversation and core.hermesInboxMessage. Workspace CASCADE FKs; message→conversation composite FK on workspaceId+conversationId prevents cross-tenant attachments. Unique external conversation identity includes workspace/channel/connection/thread; unique provider message includes workspace/channel/connection/providerID; client request uniqueness includes workspace/clientRequestId. Body and delivery state are durable, never an in-memory JSON inbox. Per-workspace PostgreSQL transaction advisory lock serializes claims and event replays; changed content under a reused provider/client identity conflicts. Real provider echoes use canonical provider message rows, with the outbound reservation retaining a reconciliation pointer. An uncertain attempt without a provider receipt cannot be guessed from text or automatically retried.

Native messaging was inspected: message/messageThread persistence requires mail-channel associations/visibility and lacks a WhatsApp connection/idempotency ledger. This core inbox intentionally does not force S3/email-group provisioning or feature flags merely to retain a received message. Native Person matching reuses the native canonical email/phone query builder inside the current workspace, never creates/merges contacts; ambiguous/archived matches are not linked. Native timeline/message projection is deferred, not claimed as implemented. Root owns official migration generation and module/metadata wiring; adapters/mail sync/webhook configuration are owned separately. No live sends or production credentials are used by this implementation.


## Bot delegation schema checkpoint (runtime follow-up pending)

Conversation adds `botMode: MANUAL|AUTO` default MANUAL, `botOwnerUserWorkspaceId: UUID|null` and `botModeUpdatedAt: Date|null`. The timestamp is a durable monotonically increasing grant/handoff epoch, changed even by an explicit repeated MANUAL request. It prevents an old in-flight MCP callback from dispatching after a human handoff and re-enable, and restricts AUTO to incoming messages occurring after its grant. No extra table/FK/index is introduced by these three columns. The operator membership is re-resolved in the current workspace and its authorization checked before use; no caller may supply a bot owner ID.

Follow-up API contract: `hermesInboxSetBotMode(input: {conversationId:UUID!,mode:String!(MANUAL|AUTO)}): {conversationId,mode,status}`. AUTO requires a real readonly MCP-ready proposal check; missing/unavailable configuration leaves MANUAL with NOT_CONFIGURED/UNAVAILABLE. Conversation queries additionally expose the three mode fields. Explicit MANUAL handoff invalidates pending callbacks. New inbound events may propose and dispatch once using a deterministic parent-message clientRequestId, fresh stored-operator authorization and mode/epoch rechecks immediately before provider handoff. Outbound echoes never trigger AUTO. Default mode remains MANUAL; enabling real bots/prospect sends in preview is not implied by this schema checkpoint.
