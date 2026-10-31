# CJ-03 — how `canReceiveMedia` and `canRecordVoice` are now derived

Lot CJ-03, branch `feat/claude-hermes-complete-whatsapp`, common base
`c12718d1ce47a59ecf6a74d88e305f816e435645`.

This is an addendum to `hermes-v4-media-contract.md`, which states that
`canReceiveMedia` and `canRecordVoice` "remain false until runtime capability is
demonstrated". That sentence described an unfinished path, not a capability
answer: both flags were the literal `false` in the Evolution probe, so the
reception and voice paths stayed closed no matter how an instance was
configured. They are now computed from what the authenticated instance itself
reports. **The contract owner should fold this into the media contract; nothing
here is a licence to call the provider verified.**

Not changed, and deliberately: no provider is configured in this environment, so
no answer below has been observed against a real Evolution instance. See
"What stays unproven".

## Where the answer is computed

One place: `EvolutionMessagesAdapter.mediaCapability`, judged by the pure
functions in
`apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-connectors/evolution/messages/evolution-media-capability.ts`.
`HermesMessagingService.connections` already required `status === 'AVAILABLE'`
and an explicit `true` for each flag, and that was left alone — it was never the
problem.

Reading a capability performs two authenticated **GET**s and nothing else. It
never writes a webhook configuration and never touches a send route, so asking
the question cannot emit a WhatsApp message.

## `canReceiveMedia`

True only when all of the following hold, each from the provider's own answer:

1. `GET /instance/connectionState/{instance}` reports state `open`.
2. `GET /` reports version exactly `2.3.6`. The stored-bytes fetch this contract
   uses (`/chat/getBase64FromMediaMessage`) exists only on that pinned build.
3. `GET /webhook/find/{instance}` returns a configuration row where
   - `enabled` is exactly `true` — an absent flag is not read as on;
   - `events` contains `MESSAGES_UPSERT`;
   - `url` is an absolute http(s) URL whose path is
     `/webhooks/hermes/evolution/<this connection's id>`.
4. The adapter was constructed with that connection's identity. The
   environment-only adapter has none and answers `false` by construction.

The connection-scoped path is not a preference. `HermesConnectedEvolutionReceiver`
refuses every delivery that does not name a connection, so an instance posting
to the bare path is rejected as unauthorized each time: a webhook that is absent,
disabled, unsubscribed or pointed elsewhere genuinely cannot deliver, and the
flag says so.

Each refusal carries a reason an operator can act on:
`PROVIDER_VERSION_UNVERIFIED`, `INGRESS_NOT_IDENTIFIED`, `WEBHOOK_NOT_READABLE`,
`WEBHOOK_NOT_CONFIGURED`, `WEBHOOK_DISABLED`, `WEBHOOK_EVENT_NOT_SUBSCRIBED`,
`WEBHOOK_URL_NOT_THIS_INGRESS`. A read that fails is reported as
`WEBHOOK_NOT_READABLE` and never as "nothing is configured": the two are
different facts.

Known bound, stated rather than hidden: the webhook **host** is not asserted.
A deployment's own public origin is not something the probe knows without new
configuration, and inventing one would turn a missing setting into a false
negative. The path plus the per-database connection UUID is what makes a
delivery reachable and attributable; which host answers is not proven here.

`webhookBase64` is read into the schema and deliberately excluded from the
judgement: we never accept provider-delivered base64 and never fetch a webhook
media URL, so its value cannot make reception more or less possible.

## `canRecordVoice`

True when the connection state is `open` and the reported version is exactly
`2.3.6` — the build that publishes `POST /message/sendWhatsAppAudio/{instance}`.

That is the whole of the available provider evidence, and it is real evidence: an
unconfigured instance, a different build or a closed socket each keep the flag
false without anyone choosing to.

What a `true` here does **not** mean: that a voice note was converted and
delivered. No endpoint at the pinned commit
`3454bec79f514995df9a5ea36a3554ab35cf1c82` reports whether the provider host can
transcode audio — the routers publish no such capability — so host-side
conversion stays unproven until a real instance is exercised. The flag asserts
route availability on a verified build, never a delivered voice note.

It currently rests on the same evidence as `canSendMedia` and is still computed
separately, so a future voice-specific report has exactly one place to land and
a closed recorder can say which question failed.

## Verified against the pinned provider source

Read at tag 2.3.6, commit `3454bec79f514995df9a5ea36a3554ab35cf1c82`:

- `src/api/integrations/event/event.router.ts` mounts the webhook router at
  `/webhook`; `src/api/integrations/event/webhook/webhook.router.ts` declares
  `find`; `src/api/abstract/abstract.router.ts` appends `/:instanceName`. The
  read is therefore `GET /webhook/find/:instanceName`.
- `EventController.get` returns the raw stored row, or `null` when the instance
  has none, so the response is a database row and not a response DTO. Unknown
  columns are expected and passed through; `enabled`, `url` and `events` are the
  only fields judged.
- `event.controller.ts` keeps its subscription list in upper snake case
  (`MESSAGES_UPSERT`), while `webhook.controller.ts` matches a delivered event by
  uppercasing it. A delivered envelope therefore reads `messages.upsert` and a
  stored subscription reads `MESSAGES_UPSERT`. Our receiver accepts the delivered
  form; the constant is only ever compared against the stored list.
- `src/api/routes/sendMessage.router.ts` publishes
  `POST /message/sendWhatsAppAudio/:instanceName`. No router at this commit
  reports ffmpeg or audio-conversion availability.

## What stays unproven

- **No real Evolution access.** The configuration is explicitly unproven and the
  provider recipe stays blocked. No instance URL, api key or webhook secret was
  read, copied or needed for this work.
- Host-side audio conversion, as above.
- An end-to-end reception against a real instance: a real inbound image through
  to private storage, display and playback has not been observed.
- A loopback demonstration provider is not provider delivery proof. The listener
  in `evolution-media-capability.spec.ts` is a few lines of that test file
  answering on `127.0.0.1`. It is labelled a demonstration in the file itself and
  must never be presented as a verified real connector.

What a real instance would settle, in order: that `/webhook/find` answers with
the row shape read above; that an inbound image arrives, is fetched by key,
passes the native sniff and lands in quarantine; and that a recorded WebM/Opus
clip is accepted by the voice route.
