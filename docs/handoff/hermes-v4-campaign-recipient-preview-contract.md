# V4 campaigns — per-recipient render contract (CJ-02 → CJ-01)

Lot CJ-02, branch `feat/claude-hermes-complete-campaign-api`. Base commune
`c12718d1ce47a59ecf6a74d88e305f816e435645`.

This contract publishes **one new operation**. It is the operation CJ-01 is missing: a
per-recipient content render that emits nothing. Everything else CJ-01 needs is already exposed
and is listed below so nobody rebuilds it.

## Why this operation is server-side

`campaign-variable.service.ts` lives on the server. Variable substitution therefore happens on
the send path, and a client-side render would misstate what the server actually sends. The point
of this operation is that the preview is produced **by the same render path as the send**, so it
cannot drift from it.

It also fills a real validation hole. Campaign drafts are persisted through the generic
`updateOneRecord` path on `MessageCampaign`, which does **not** run `parseEmailDocument`
stamping nor `assertKnownVariables`. Those only run at send time, inside
`findSendableCampaignOrThrow`. So an unknown variable or a malformed body is currently invisible
until the operator tries to send. This operation surfaces both **before** sending, as typed
errors.

## The new operation

```graphql
query PreviewMessageCampaignRecipient($input: PreviewMessageCampaignRecipientInput!) {
  previewMessageCampaignRecipient(input: $input) {
    personId
    email
    subject
    html
    plainText
    variablesUsed
    isRecipientSendable
    recipientExclusionReason
    envelope {
      fromAddress
      senderStatus
      openMarkerWouldBeIncluded
      clickTrackingWouldBeApplied
      unsubscribeLinkWouldBeIncluded
    }
  }
}
```

### Input

```graphql
input PreviewMessageCampaignRecipientInput {
  campaignId: String!   # UUID v4, required
  personId: String      # UUID v4, optional
}
```

`personId` omitted means: render for the **first sendable recipient** of the campaign's resolved
audience, in the engine's own normalized order. That is the "just show me what this looks like"
case and needs no picker interaction.

When `personId` is given, **it must be a member of the campaign's list.** Membership is checked
under the caller's role before any person row is read and before anything is composed; a person
outside the list is refused with `MESSAGE_CAMPAIGN_NOT_FOUND`, and a campaign with no list at all
refuses every explicit `personId`. A render is never a way to read someone the caller is not
entitled to see, nor to reach outside the audience. A list member who is currently *excluded*
(opposed, or dropped by the audience resolution) **is** previewable, with the reason reported —
that is the useful case.

### Output

`MessageCampaignRecipientPreviewDTO`:

| Field | Type | Meaning |
| --- | --- | --- |
| `personId` | `String!` | The person actually rendered. |
| `email` | `String!` | That person's normalized primary email. |
| `subject` | `String!` | Subject after variable substitution. |
| `html` | `String!` | Body HTML as the engine composes it for this person. |
| `plainText` | `String!` | The plain-text alternative the engine derives. |
| `variablesUsed` | `[String!]!` | Sorted variable names found in subject + body. |
| `isRecipientSendable` | `Boolean!` | Whether this person would receive the campaign today. |
| `recipientExclusionReason` | `String` | Null when sendable; otherwise a code (below). |
| `envelope` | `MessageCampaignPreviewEnvelopeDTO!` | The resolved envelope, sender included. |

`MessageCampaignPreviewEnvelopeDTO`:

| Field | Type | Meaning |
| --- | --- | --- |
| `fromAddress` | `String` | The persisted sender, or null when none is saved yet. |
| `senderStatus` | `String!` | What was verified about that sender's domain (codes below). |
| `openMarkerWouldBeIncluded` | `Boolean!` | Whether an open marker would be embedded for this recipient. |
| `clickTrackingWouldBeApplied` | `Boolean!` | Whether links would be rewritten for this recipient. |
| `unsubscribeLinkWouldBeIncluded` | `Boolean!` | Whether unsubscribe affordances would be attached. |

Codes follow the convention already used by `MessageCampaignSendBlockerDTO.code`: plain strings
from a closed set, not a GraphQL enum, so the parent's codegen needs no new enum.

`senderStatus` names **only what was inspected: emailing-domain rows.** The mailbox, the central
`MAIL` connection, the `connectedAccount` and the SMTP transport are **not** consulted by the
preview, so no value here may be read as "the provider can send". That is why there is no
`SEND_READY`.

- `DOMAIN_PREREQUISITES_MET` — an emailing domain row matches the sender, is `VERIFIED`, and its
  unsubscribe hostname is active. Nothing more.
- `NOT_PERSISTED` — no `fromAddress` saved on the campaign yet.
- `DOMAIN_NOT_VERIFIED` — no verified emailing domain matches the sender's domain.
- `UNSUBSCRIBE_HOSTNAME_NOT_READY` — the domain is verified but its unsubscribe hostname is not active.

`recipientExclusionReason` is null, or one of:

- `HARD_SUPPRESSED`, `GLOBALLY_UNSUBSCRIBED`, `TOPIC_UNSUBSCRIBED` — durable opposition.
- `NO_EMAIL` — the member carries no usable address.
- `NOT_IN_AUDIENCE` — a list member the audience resolution still dropped, for example as a
  duplicate address.

### Honesty rules, binding on both lots

- **Nothing is emitted.** No transport is opened, no provider contacted, no message staged, no
  ledger or delivery row written, no quota or billing consumed. The preview does not touch
  `EmailingDomainSenderService`.
- **`senderStatus` is never synthesised.** `SEND_READY` is returned only when the verified-domain
  and active-unsubscribe-hostname checks both actually pass. An unconfigured provider yields a
  refusal code, never a reassuring one.
- **`openMarkerWouldBeIncluded` does not measure a read.** It reports only whether a marker would
  be *embedded*. An embedded marker that is later fetched proves an image was loaded, which is
  not a certain read; blocked images, proxy prefetch and caches all break that inference. Neither
  lot may label this as a read, an "opened" status, or a certainty.
- **`isRecipientSendable: false` is not a render error.** The content still renders, so the
  operator can see what the message would say, while the flag says they would not get it.
- **A null read fails.** If the role-scoped person read returns nothing, the operation refuses
  rather than rendering with empty variables, which would look plausible and be wrong.
- **No side effect of any kind.** No SMTP or MCP call, no billing or send-slot consumption, no
  ledger or delivery write, no unsubscribe or suppression mutation. The operation composes and
  returns.
- **On the frontend.** The returned `html` must be rendered inertly: no script execution, and no
  loading of the real recipient's tracking pixel, so a preview can never fabricate an open. The
  UI states its image and tracking limitations explicitly.

### Errors

Typed `EmailingDomainException`, surfaced through the resolver's existing
`EmailingDomainGraphqlApiExceptionFilter`:

- `MESSAGE_CAMPAIGN_NOT_FOUND` — unknown campaign, or not visible to this role.
- `MESSAGE_CAMPAIGN_NOT_SENDABLE` — no subject, no body, a body that is not a canonical
  `EmailDocument`, **or** a variable the workspace does not define. The existing
  `assertKnownVariables` already raises `MESSAGE_CAMPAIGN_NOT_SENDABLE` for unknown variables,
  listing the offending names and the available ones in its message, so no new exception code is
  introduced. CJ-01 should surface `message` to distinguish these cases, not the code alone.

An empty audience with no `personId` given is `MESSAGE_CAMPAIGN_NOT_SENDABLE` with a message
saying the audience resolved to no sendable recipient.

### Guards

The query joins `EmailingSendResolver` and inherits its class-level guards unchanged:
`AuthPrincipalGuard`, `SettingsPermissionGuard(PermissionFlagType.WORKSPACE)`, and
`FeatureFlagGuard(FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED)` per operation. Repository access
is role-scoped through `buildEmailingRolePermissionConfig`, so a role that cannot read the
campaign gets `MESSAGE_CAMPAIGN_NOT_FOUND` rather than someone else's content, and company
scoping is the workspace scoping the resolver already enforces.

## Already exposed — reuse, do not rebuild

Confirmed by reading `src/modules/emailing/resolvers/emailing-send.resolver.ts` at the base
commit:

- `sendMessageCampaign(input: { campaignId, scheduledAt? })` — `scheduledAt` is `@IsOptional()`,
  so this single mutation is both the immediate human send and the scheduling.
- `cancelMessageCampaign(input: { campaignId })`.
- `sendMessageCampaignTest(input: { toAddress, subject, body, fromAddress, unsubscribeTopicId? })`
  — explicitly addressed test send.
- `previewMessageCampaignSend(input: { campaignId, scheduledAt? })` → `{ audience, blockers }`.
- `previewMessageCampaignAudience(input: { listId, unsubscribeTopicId? })`.

Persistence of `name`, `subject`, `bodyTemplate`, `fromAddress`, `listId` and
`unsubscribeTopicId` is reachable through the generic `updateOneRecord` path on
`MessageCampaign`; CJ-02 adds no competing save mutation.

## Known limit, stated rather than hidden

`sendableCampaignSchema` requires `fromAddress.primaryEmail`, and
`MessageCampaignDraftService.saveDraft` never writes `fromAddress`. A campaign created through
that service alone is therefore not sendable. CJ-01 persists the sender through the generic
record path instead, which closes the journey; the draft service keeps its gap, and this contract
records it rather than papering over it. `envelope.senderStatus` is what tells the operator the
sender is missing.

## Sender prerequisites for a provider-managed mailbox — investigated, not blocked

Root asked whether "campaigns from my own SMTP mailbox" is reachable for someone who
authenticates a mailbox but does **not** control that mailbox's domain DNS, for example a
provider-managed address. It is reachable, and no DNS status has to be faked to test it.

Sending a campaign requires an `EmailingDomainEntity` matching the From domain with
`status = VERIFIED` and `unsubscribeHostnameStatus = ACTIVE`
(`MessageCampaignService.findSendReadyEmailingDomainOrThrow`, plus
`EmailingDomainSenderService.assertDomainCanSend`). Both are reachable through the product
without controlling DNS:

- **`VERIFIED` needs no DNS under the SMTP driver.** `SmtpEmailingDomainDriver.verifyDomain`
  opens the transport and calls `transport.verify()`; on success it returns `VERIFIED` with an
  empty `verificationRecords`. Its own comment is explicit: "SMTP connectivity does not prove
  that SPF or DKIM records are installed." So verification here means the registered mailbox
  answered, not that the domain is authenticated.
- **`ACTIVE` needs no customer DNS when no DNS manager is configured.**
  `UnsubscribeHostnameService.sync` checks `dnsManagerService.isConfigured()`; when it is not, it
  calls `useServerHostname`, which sets the unsubscribe hostname to the `SERVER_URL` host and the
  status to `ACTIVE` directly. The only condition is that `SERVER_URL` is `https:` — otherwise it
  returns early, the hostname stays unset, and the send refuses with
  `EMAILING_DOMAIN_UNSUBSCRIBE_NOT_READY`.

So the isolated SMTP acceptance can drive the real chain — native `connectedAccount` → central
`MAIL` connection → sender identity → campaign → capture — with an `https` `SERVER_URL`, no DNS
manager, and the domain verified by connectivity through the registered mailbox itself. Nothing is
seeded that the product could not produce.

**Two limits that must not be dressed up.** A `VERIFIED` emailing domain under the SMTP driver
says nothing about SPF or DKIM, so inbox deliverability remains unproven and must never be
reported as authenticated. And `DOMAIN_PREREQUISITES_MET` is a statement about domain rows only:
a mailbox that was revoked, re-keyed or has become unreachable still yields that status, because
the authority check for the transport happens at send time in
`EmailingDomainMailboxTransportProvider`, which fails closed there. The preview does not and must
not pre-empt it.

## Evidence

All fakes below are isolated protocol fixtures, clearly labelled in the source as demonstration
doubles. They are never real verified connectors, and no message reaches any real recipient.

#### Dependency resolution — required, or two suites cannot load

The worktree carries **no** `node_modules` of its own: the dependency tree is borrowed read-only
from the shared checkout by a symlink, and that symlink is **removed before every commit** so it
never enters Git. A fresh checkout of this SHA therefore has nothing to resolve against, and the
two suites that need `nodemailer` (the acceptance spec, directly) and `lodash.chunk` (pulled in
transitively through the module graph) fail to load. That is the whole cause; nothing is missing
from the shared tree.

Re-create the symlink first, from the worktree root:

```
ln -sfn /Volumes/Stockage/dev/hermes-crm/test-Crm/apps/crm/ui/node_modules apps/crm/ui/node_modules
```

Nothing is installed and nothing is written into the original checkout — it is one symlink, read
only, and it is deleted again before staging. No `NODE_PATH`, no alternate package directory and
no cache directory is used. Node's own upward lookup from the jest cwd does the rest, which is
verifiable:

```
cd apps/crm/ui/packages/twenty-server
node -e "console.log(require.resolve('nodemailer'), require.resolve('lodash.chunk'))"
/Volumes/Stockage/dev/hermes-crm/test-Crm/apps/crm/ui/node_modules/nodemailer/dist/cjs/nodemailer.js
/Volumes/Stockage/dev/hermes-crm/test-Crm/apps/crm/ui/node_modules/lodash.chunk/index.js
```

Both are ordinary declared dependencies of the shared tree, so **cloud CI resolves them with no
symlink and no special step.** The symlink is purely a local-disk workaround for this worktree.

Then run from `apps/crm/ui/packages/twenty-server`:

```
node ../../node_modules/jest/bin/jest.js --config jest.config.mjs --runInBand --runTestsByPath \
  src/modules/emailing/services/__tests__/message-campaign-recipient-preview.service.spec.ts \
  src/modules/emailing/services/__tests__/campaign-native-mailbox-smtp-acceptance.spec.ts \
  src/modules/emailing/services/__tests__/emailing-domain-sender-quarantine.spec.ts \
  src/modules/emailing/services/__tests__/campaign-unconfirmed-quarantine.spec.ts \
  src/modules/emailing/tools/__tests__/save-campaign-tool.spec.ts \
  src/modules/emailing/zod-schemas/__tests__/sendable-campaign.zod-schema.spec.ts \
  src/modules/emailing/utils/__tests__/compile-campaign-email-content.util.spec.ts
```

### SMTP sending-chain acceptance — exact perimeter

`campaign-native-mailbox-smtp-acceptance.spec.ts` exercises exactly this perimeter:

```
EmailingDomainSenderService.sendEmail
  -> real EmailingDomainMailboxTransportProvider
  -> real SmtpEmailingDomainDriver
  -> loopback TCP socket speaking SMTP
```

**What is real:** the sender service, the mailbox transport provider, the SMTP driver, the
unsubscribe content service, and the SMTP conversation down to captured bytes on a socket.

**What is mocked:** the central `MAIL` connection reader, the native SMTP client provider (so the
`connectedAccount` and its credentials), the emailing-domain row, and the suppression service.

**What this is therefore NOT:** it is **not** HTTP — no GraphQL resolver, no guard, no auth
context is executed. It is **not** PostgreSQL — no workspace schema, no `campaignDelivery` row, no
migration. And it is **not** a real onboarding: because the `MAIL` connection is a double, this
spec **cannot** show that a user who configured a mailbox through the product can send. It proves
the *sending chain* given a registered mailbox, not the *acquisition* of that mailbox.

That distinction matters because the user's request is "campaigns from **my own** mailbox". The
product-level isolated recipe that would close it belongs to integration, not to this spec.

Within that perimeter it proves:

- the campaign is captured by the registered mailbox and the relay captures **nothing**;
- the envelope and `From` are the registered mailbox's exact address;
- the native client provider is asked for exactly the published `connectedAccountId`;
- a marketing send carries its `List-Unsubscribe` affordances;
- a sender that merely shares the verified domain is refused, capturing nothing;
- an unregistered workspace is refused rather than falling back to the relay;
- a **lost acknowledgement** yields `SEND_OUTCOME_UNCONFIRMED` with the message handed over
  exactly once — the caller is told the outcome is unknown instead of being invited to resend.

**The fixture was mutation-checked, so it is not a mock that merely mirrors the code.** Building
the driver without the mailbox transport provider — the pre-V4 behaviour — turns 5 of those 6
tests red: the message then leaves through the environment relay and the same-domain intruder is
accepted. The assertions are load-bearing.

### The real setup is NOT proved, and is kept separate from the send proof

The send proof above assumes a mailbox and a sendable domain already exist. **Their acquisition is
seeded by fixture and is not proved anywhere in this lot:**

- the `MAIL` connection and its `connectedAccountId` are a test double, not a mailbox someone
  authenticated through the product;
- the emailing-domain row — `status: VERIFIED`, `unsubscribeHostnameStatus: ACTIVE` — is a fixture
  object, not a row the product produced.

The earlier section shows those two states are *reachable* through the product without DNS
control, by reading `SmtpEmailingDomainDriver.verifyDomain` and
`UnsubscribeHostnameService.sync`. That is a **source reading, not an executed proof.** Nothing
here demonstrates the user-side onboarding end to end, and it must not be reported as if it did.

The domain and sender refusals are left exactly as the product has them. No relaxation was asked
for and none was made: the same-domain intruder, the unregistered workspace and the inactive
unsubscribe hostname all still refuse.

### Also not proved here

No real delivery and no SPF/DKIM authenticity: a loopback fixture accepts bytes, it does not
deliver them, and `VERIFIED` under the SMTP driver means connectivity only. Inbox placement with a
real provider remains to be verified with authorised access, and the preview's
`openMarkerWouldBeIncluded` reports an embedded marker, never a read.
