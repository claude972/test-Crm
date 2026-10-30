# Hermes V4 — mailbox backend contract (C)

Branch `feat/codex-hermes-v4-mail`, base `baece3a46a6286a933cfc99b22a53ac50c34e498`.
Owned files: `engine/core-modules/hermes-mail/**` and this document. No messaging/media DTO or entity edits. No new mail engine, credential store, service or package.

## Implemented first slice

Metadata GraphQL uses the same standard tenant-bound user session guard as the existing inbox, denies API key/application/impersonation, and rechecks the current unrestricted administrator role. Workspace/user/membership always come from the session. The account is resolved through the existing server binding and native encrypted ConnectedAccount; absent configuration is not a connection proof.

- `hermesMailFoldersV4: JSONObject!` returns `{state,folders:[{path,name,role,total,unread}]}`. Roles INBOX/SENT/DRAFTS/ARCHIVE/TRASH/CUSTOM derive from native IMAP special-use flags. Unknown counts are null. Nonselectable folders excluded; no fabricated zero or folder.
- `hermesMailMessagesV4(input:HermesMailPageInput!): JSONObject!`, `{folder,limit?:1..50,cursor?:string}` returns `{state,folder,uidValidity,messages:[{uid,subject,from,to,cc,occurredAt,seen,size}],nextCursor}`. UID pagination newest first; cursor binds the folder and UIDVALIDITY. A mailbox reset fails `MAIL_CURSOR_EXPIRED`; refresh from first page.
- `hermesMailMessageV4(input:HermesMailMessageInput!): JSONObject!`, `{folder,uid,uidValidity}`. Native bounded MIME read, text+allowlisted HTML, remote image sources/CSS/forms/scripts/SVG removed. Bcc only visible to the bound mailbox owner. Attachment metadata has `state:REQUIRES_PRIVATE_IMPORT` until the B scoped native-file import is integrated; never use metadata as an enabled download action.
- `hermesMailUpdateV4(input:HermesMailUpdateInput!): JSONObject!`, scope above plus `{seen?:boolean,destination?:string}`. Uses native flag add/remove and move to an existing selectable folder; no permanent-delete operation.
- `hermesMailPlanV4(input:HermesMailComposeInput!): JSONObject!`, scope plus `{mode:REPLY|REPLY_ALL|FORWARD,from,to?,cc?,bcc?,text,html?,conversationId?,clientRequestId?,attachmentIds?}`. Resolves original MIME server-side; Reply-To preference, case-insensitive own-address exclusion and To/CC/Bcc deduplication, never copies received Bcc, forwards without reply references. Exact mailbox sender required in first slice; same-domain substitution rejected. Returns `{state:PLANNED,envelope}` for preview, no emission.
- `hermesMailSaveDraftV4(input:HermesMailComposeInput!): JSONObject!`: compiles native MailComposer MIME and appends to the provider's real special-use Drafts folder with `\\Draft`. Returns `{state:SAVED,folder,uid,uidValidity}`; no SMTP call. Missing provider/drafts folder fails explicitly. First slice rejects attachment IDs until scoped byte assembly is connected.

Existing `hermesInboxSyncEmail` and messaging v1 remain compatible. These signatures are additive. Read-only inbox APIs use Query; commands use Mutation. `MAIL_NOT_CONFIGURED`, `MAIL_TIMEOUT`, UID validity/permission/scope errors are errors, not empty mailboxes or synthetic success.

## Coordinated B integration (in progress)

`messaging.replyEmail(actor,{conversationId,clientRequestId,envelope,attachmentIds})` reserves all attachments atomically in B's durable ledger and rechecks role/policy before provider call. C owns exact sender/recipient/MIME preparation and passes an envelope plus private byte attachments to the existing SMTP adapter. No direct-send endpoint may bypass this method. Timeout/UNCONFIRMED must reuse the original request ID and must never trigger a blind retry/new ID. ACCEPTED means SMTP acceptance, not delivered/read.

B native media supports FILE and EMAIL conversation scopes, max10 attachments/25MiB total, each PDF/DOCX/XLSX/PPTX ≤20MiB or supported image format. Incoming MIME remains bounded to36MiB (base64 overhead included). Read assets through session-bound private `hermesMediaRead`; no provider/static URL. Forwarding clones through `cloneForConversation` after both source and target authorization. CID metadata may reference only private scoped imported image assets; no arbitrary cid/data/http source is enabled. This integration and native protocol tests must pass before enabling rich sending/downloads in UI.

## Sources and honest evidence

Versions are from existing server package.json: imapflow2.0.2, postal-mime^2.6.1, sanitize-html2.17.7; no dependency introduced. APIs were checked against installed native TypeScript definitions and upstream source, not guessed endpoints. Native IMAP `list/status/getMailboxLock/fetchOne/fetchAll/messageFlagsAdd/messageFlagsRemove/messageMove/append`; PostalMime.parse source+nesting/header bounds; sanitize-html explicit allowlist. [Nodemailer SMTP envelope](https://nodemailer.com/smtp/envelope) distinguishes header recipients and actual SMTP envelope.

No provider is configured in this workspace. Unit or loopback protocol evidence does not prove live IMAP/SMTP connectivity, provider delivery, frontend wiring or a completed V4 release. No new entity/schema so this slice requires no instance migration. Any later entity change must use the official2.52 generator against a fresh fixture only.
