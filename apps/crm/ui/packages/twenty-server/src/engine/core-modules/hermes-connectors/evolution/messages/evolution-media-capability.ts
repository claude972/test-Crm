import { z } from 'zod';

// What the provider must actually report before a media capability is opened.
//
// Everything in this file judges evidence. Nothing here decides a capability
// from a preference, an environment variable or an operator's assertion: each
// answer is derived from what the authenticated Evolution instance returned, so
// an unconfigured or incapable instance keeps answering false on its own.
//
// Primary source pinned to the official tag 2.3.6, commit
// 3454bec79f514995df9a5ea36a3554ab35cf1c82:
//   - src/api/routes/index.router.ts            GET /                       -> packageJson.version
//   - src/api/integrations/event/event.router.ts + webhook/webhook.router.ts
//     mount the event router at '' and the webhook router at '/webhook', and
//     abstract.router.ts appends '/:instanceName', so the configuration read is
//                                                 GET /webhook/find/:instanceName
//   - src/api/routes/sendMessage.router.ts      POST /message/sendWhatsAppAudio/:instanceName
//
// The media routes this contract uses exist only on that exact build, so the
// reported version gates every media answer. Text remains compatible and is not
// gated here.
export const EVOLUTION_MEDIA_VERSION = '2.3.6';

// How a subscription is stored, not how a delivery is labelled.
//
// event.controller.ts keeps its `events` list in upper snake case, and
// webhook.controller.ts matches an incoming event by uppercasing it
// (`event.replace(/[.-]/gm, '_').toUpperCase()`). A delivered envelope therefore
// carries `messages.upsert` while the stored subscription reads MESSAGES_UPSERT.
// Our receiver accepts the delivered form; this constant is only ever compared
// against the stored list.
export const EVOLUTION_UPSERT_EVENT = 'MESSAGES_UPSERT';

// Our own ingress path, and the reason reception needs the connection in it.
//
// HermesConnectedEvolutionReceiver.receive refuses any delivery that does not
// name a connection, so an instance posting to the bare path is rejected with
// WEBHOOK_UNAUTHORIZED every single time. The connection-scoped path is the only
// one that can ever be received, which is why a webhook pointed at the bare path
// is treated here as reception not being configured rather than as a detail.
export const EVOLUTION_INGRESS_PATH = '/webhooks/hermes/evolution';

// The read returns the provider's raw stored row, not a response DTO
// (EventController.get returns `findUnique(...)` as-is), so unknown columns are
// expected and passed through. Only the four fields this judgement needs are
// typed, and each is optional/nullable because a row may predate them.
export const evolutionWebhookRowSchema = z
  .object({
    enabled: z.boolean().nullish(),
    url: z.string().max(2048).nullish(),
    events: z.array(z.string().max(120)).max(200).nullish(),
    // Stored as webhookBase64 on the row; the request body nests it as
    // webhook.base64. We never read provider-delivered base64 and never fetch a
    // webhook media URL, so this is deliberately not part of the judgement.
    webhookBase64: z.boolean().nullish(),
  })
  .passthrough();

export type EvolutionWebhookConfiguration =
  // The provider answered and holds a configuration row.
  | { kind: 'row'; row: unknown }
  // The provider answered that no webhook is configured for this instance
  // (EventController.get returns null when the row is missing).
  | { kind: 'absent' }
  // The read itself did not produce a usable answer. This is not a claim that
  // nothing is configured, only that nothing was proven.
  | { kind: 'unreadable' };

export type EvolutionReceptionBlockReason =
  // The build is not the pinned 2.3.6, so neither the stored-bytes fetch nor
  // this contract's reception path is available.
  | 'PROVIDER_VERSION_UNVERIFIED'
  // This adapter was built without the connection identity its ingress needs,
  // so no reported webhook URL could be recognized as ours. The environment-only
  // adapter is in this state by construction.
  | 'INGRESS_NOT_IDENTIFIED'
  | 'WEBHOOK_NOT_READABLE'
  | 'WEBHOOK_NOT_CONFIGURED'
  | 'WEBHOOK_DISABLED'
  | 'WEBHOOK_EVENT_NOT_SUBSCRIBED'
  | 'WEBHOOK_URL_NOT_THIS_INGRESS';

export type EvolutionReceptionJudgement = {
  canReceiveMedia: boolean;
  reason: EvolutionReceptionBlockReason | null;
};

// Does the reported webhook URL address this exact ingress and connection?
//
// The host is deliberately not asserted. A deployment's own public origin is not
// something this probe knows without new configuration, and inventing one would
// turn a missing setting into a false negative. The path and the connection
// identity are what make a delivery reachable and attributable, and the
// connection identity is a per-database UUID, so this is the honest bound: it
// proves the instance is addressing this ingress for this connection, and it
// does not prove which host answers.
const addressesThisIngress = (
  reported: string,
  connectionId: string,
): boolean => {
  let url: URL;

  try {
    url = new URL(reported);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false;
  }

  const pathname = url.pathname.endsWith('/')
    ? url.pathname.slice(0, -1)
    : url.pathname;

  return pathname === `${EVOLUTION_INGRESS_PATH}/${connectionId}`;
};

// Can an inbound image, video or voice note actually reach this workspace?
//
// Every branch below is a real refusal with a reason an operator can act on. The
// order is the order the evidence becomes meaningful: the build first, then our
// own ability to attribute a delivery, then what the provider says it will send
// and where.
export const judgeEvolutionReception = (evidence: {
  versionVerified: boolean;
  ingressConnectionId: string | null;
  webhook: EvolutionWebhookConfiguration;
}): EvolutionReceptionJudgement => {
  if (!evidence.versionVerified) {
    return { canReceiveMedia: false, reason: 'PROVIDER_VERSION_UNVERIFIED' };
  }

  if (evidence.ingressConnectionId === null) {
    return { canReceiveMedia: false, reason: 'INGRESS_NOT_IDENTIFIED' };
  }

  if (evidence.webhook.kind === 'unreadable') {
    return { canReceiveMedia: false, reason: 'WEBHOOK_NOT_READABLE' };
  }

  if (evidence.webhook.kind === 'absent') {
    return { canReceiveMedia: false, reason: 'WEBHOOK_NOT_CONFIGURED' };
  }

  const parsed = evolutionWebhookRowSchema.safeParse(evidence.webhook.row);

  if (!parsed.success) {
    return { canReceiveMedia: false, reason: 'WEBHOOK_NOT_READABLE' };
  }

  if (parsed.data.enabled !== true) {
    return { canReceiveMedia: false, reason: 'WEBHOOK_DISABLED' };
  }

  if (!(parsed.data.events ?? []).includes(EVOLUTION_UPSERT_EVENT)) {
    return {
      canReceiveMedia: false,
      reason: 'WEBHOOK_EVENT_NOT_SUBSCRIBED',
    };
  }

  if (
    typeof parsed.data.url !== 'string' ||
    !addressesThisIngress(parsed.data.url, evidence.ingressConnectionId)
  ) {
    return { canReceiveMedia: false, reason: 'WEBHOOK_URL_NOT_THIS_INGRESS' };
  }

  return { canReceiveMedia: true, reason: null };
};

export type EvolutionVoiceBlockReason = 'PROVIDER_VERSION_UNVERIFIED';

export type EvolutionVoiceJudgement = {
  canRecordVoice: boolean;
  reason: EvolutionVoiceBlockReason | null;
};

// Will a recorded voice note be accepted by this instance?
//
// What this answer is, exactly: the pinned build publishes
// POST /message/sendWhatsAppAudio/:instanceName, and the socket is open. That is
// the whole of the provider-reported evidence available, and it is real evidence:
// an unconfigured instance, a different build or a closed socket each keep this
// false without anyone choosing to.
//
// What this answer is NOT: proof that a voice note was converted and delivered.
// No endpoint at commit 3454bec79f514995df9a5ea36a3554ab35cf1c82 reports whether
// the provider host can transcode audio — the routers publish no such capability
// — so host-side conversion stays unproven until a real instance is exercised,
// and a true answer here must never be read as a verified voice delivery.
//
// It is computed separately from canSendMedia on purpose. The two currently rest
// on the same evidence, and keeping them apart means a future voice-specific
// report has exactly one place to land, and an operator reading a closed
// recorder is told which question failed.
export const judgeEvolutionVoice = (evidence: {
  versionVerified: boolean;
}): EvolutionVoiceJudgement =>
  evidence.versionVerified
    ? { canRecordVoice: true, reason: null }
    : { canRecordVoice: false, reason: 'PROVIDER_VERSION_UNVERIFIED' };
