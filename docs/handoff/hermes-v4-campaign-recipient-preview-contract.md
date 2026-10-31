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
case and needs no picker interaction. When `personId` is given, that person is rendered even if
they are currently excluded — see `isRecipientSendable`.

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
| `senderStatus` | `String!` | Whether that sender could send now (codes below). |
| `openMarkerWouldBeIncluded` | `Boolean!` | Whether an open marker would be embedded for this recipient. |
| `clickTrackingWouldBeApplied` | `Boolean!` | Whether links would be rewritten for this recipient. |
| `unsubscribeLinkWouldBeIncluded` | `Boolean!` | Whether unsubscribe affordances would be attached. |

Codes follow the convention already used by `MessageCampaignSendBlockerDTO.code`: plain strings
from a closed set, not a GraphQL enum, so the parent's codegen needs no new enum.

`senderStatus` is one of:

- `SEND_READY` — a verified emailing domain matches the sender and its unsubscribe hostname is active.
- `NOT_PERSISTED` — no `fromAddress` saved on the campaign yet.
- `DOMAIN_NOT_VERIFIED` — no verified emailing domain matches the sender's domain.
- `UNSUBSCRIBE_HOSTNAME_NOT_READY` — the domain is verified but its unsubscribe hostname is not active.

`recipientExclusionReason` is null, or one of:

- `HARD_SUPPRESSED`, `GLOBALLY_UNSUBSCRIBED`, `TOPIC_UNSUBSCRIBED` — durable opposition.
- `NO_EMAIL`, `NOT_IN_AUDIENCE` — the person carries no usable address, or is not in the list.

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

### Errors

Typed `EmailingDomainException`, surfaced through the resolver's existing
`EmailingDomainGraphqlApiExceptionFilter`:

- `MESSAGE_CAMPAIGN_NOT_FOUND` — unknown campaign, or not visible to this role.
- `MESSAGE_CAMPAIGN_NOT_SENDABLE` — no subject, no body, or a body that is not a canonical
  `EmailDocument`.
- `MESSAGE_CAMPAIGN_UNKNOWN_VARIABLE` — the subject or body uses a variable the workspace does
  not define. Raised by the existing `assertKnownVariables`.

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
