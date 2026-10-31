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

// The header our ingress authenticates every delivery with.
//
// EvolutionWebhookController reads it and HermesConnectedEvolutionReceiver
// compares it to this connection's stored webhookSecret with a timing-safe
// comparison. A webhook without it is refused 401 on every single delivery, so
// its absence makes reception impossible however well the URL is set.
export const EVOLUTION_INGRESS_TOKEN_HEADER = 'x-hermes-evolution-token';

// The read returns the provider's raw stored row, not a response DTO
// (EventController.get returns `findUnique(...)` as-is), so unknown columns are
// expected and passed through. Only the fields this judgement needs are typed,
// and each is optional/nullable because a row may predate them.
export const evolutionWebhookRowSchema = z
  .object({
    enabled: z.boolean().nullish(),
    url: z.string().max(2048).nullish(),
    events: z.array(z.string().max(120)).max(200).nullish(),
    // The headers the provider will send with each delivery. Confirmed as
    // `headers Json?` on the pinned row (prisma/postgresql-schema.prisma,
    // migration 20240906202019) and forwarded into the delivery request by
    // webhook.controller.ts. Anything may be stored, so only a string value
    // under our token header is ever read, and its value never leaves this
    // process.
    headers: z.unknown().nullish(),
    // Whether the provider appends a per-event segment to the configured URL.
    // webhook.controller.ts builds `${instance.url}/${transformedWe}` when this
    // is truthy, so it decides where a delivery lands and must be judged.
    //
    // Left unknown here rather than typed as a boolean, so that an unexpected
    // value is classified by readEvolutionDeliveryForm as UNPROVEN instead of
    // failing the whole row parse — which would report the row unreadable and
    // hide the more precise reason.
    webhookByEvents: z.unknown().nullish(),
    // Stored as webhookBase64 on the row; the request body nests it as
    // webhook.base64. It changes the payload, never the destination, and is
    // never read in webhook.controller.ts. We never accept provider-delivered
    // base64 and never fetch a webhook media URL, so it is deliberately not
    // part of the judgement.
    webhookBase64: z.boolean().nullish(),
  })
  .passthrough();

// Where a delivery will actually be POSTed, as a shape rather than a URL.
//
// SIMPLE    — the configured URL is the destination.
// PER_EVENT — the provider appends a per-event segment, so the destination is
//             `<url>/messages-upsert` and not the configured URL at all.
// UNPROVEN  — the row does not say which, so the destination is unknown.
export type EvolutionDeliveryForm = 'SIMPLE' | 'PER_EVENT' | 'UNPROVEN';

// Reads the delivery form from the row's own flag.
//
// An absent or non-boolean flag is UNPROVEN, never assumed to be the simple
// form: assuming it would be the same mistake as assuming an absent `enabled`
// means on. Judging the configured URL while the provider appends a segment to
// it would be judging a different URL than the one that gets called.
export const readEvolutionDeliveryForm = (
  webhookByEvents: unknown,
): EvolutionDeliveryForm =>
  webhookByEvents === false
    ? 'SIMPLE'
    : webhookByEvents === true
      ? 'PER_EVENT'
      : 'UNPROVEN';

// Whether the provider will present a token our ingress accepts.
//
// MATCHED       — a header equal to this connection's secret is configured.
// MISMATCHED    — a token is configured and it is not ours, so every delivery
//                 is refused 401.
// NOT_CONFIGURED— the provider reported its headers and none is our token.
// UNVERIFIABLE  — nothing about headers could be established: the row did not
//                 report them, or this caller supplied no way to check. Not a
//                 claim that authentication is missing, only that it is unproven.
export type EvolutionIngressTokenEvidence =
  | 'MATCHED'
  | 'MISMATCHED'
  | 'NOT_CONFIGURED'
  | 'UNVERIFIABLE';

// Reads the provider-reported headers and says which of the four cases holds.
//
// The comparison is delegated: this module is never handed the webhook secret,
// and the reported value is neither returned, logged nor included in any
// judgement, so a secret cannot reach an output through here.
export const readEvolutionIngressToken = (
  headers: unknown,
  matches: ((value: string) => boolean) | null,
): EvolutionIngressTokenEvidence => {
  if (matches === null) return 'UNVERIFIABLE';
  if (headers === null || headers === undefined) return 'UNVERIFIABLE';
  if (typeof headers !== 'object' || Array.isArray(headers))
    return 'UNVERIFIABLE';

  // HTTP header names are case-insensitive, and an operator may have typed the
  // header in any case.
  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([name]) => name.toLowerCase() === EVOLUTION_INGRESS_TOKEN_HEADER,
  );

  if (entry === undefined || typeof entry[1] !== 'string')
    return 'NOT_CONFIGURED';

  return matches(entry[1]) ? 'MATCHED' : 'MISMATCHED';
};

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
  // No expected public ingress origin was configured, so no reported URL can be
  // recognized as addressing this deployment. Unproven, never guessed.
  | 'INGRESS_ORIGIN_UNKNOWN'
  | 'WEBHOOK_NOT_READABLE'
  | 'WEBHOOK_NOT_CONFIGURED'
  | 'WEBHOOK_DISABLED'
  | 'WEBHOOK_EVENT_NOT_SUBSCRIBED'
  // The reported URL does not address this deployment's ingress for this
  // connection: wrong origin, wrong path, or another connection's id.
  | 'WEBHOOK_URL_NOT_THIS_INGRESS'
  // The provider appends a per-event segment to the URL, so deliveries land on
  // `<url>/messages-upsert`. Our ingress serves no such route and would answer
  // 404 — or, with the bare path configured, read the segment as a connection
  // id and refuse 401. Either way nothing can ever be received.
  | 'WEBHOOK_PER_EVENT_PATH_NOT_SERVED'
  // The row does not say whether a per-event segment is appended, so the
  // destination is unknown and reception is not claimed.
  | 'WEBHOOK_DELIVERY_FORM_UNPROVEN'
  // The provider reported its headers and our ingress token is not among them,
  // so our own controller would refuse every delivery with 401.
  | 'WEBHOOK_TOKEN_NOT_CONFIGURED'
  | 'WEBHOOK_TOKEN_MISMATCHED'
  // Nothing could be established about the delivery token. Reception stays
  // unproven rather than being claimed on an unchecked guess.
  | 'WEBHOOK_TOKEN_UNVERIFIABLE';

export type EvolutionReceptionJudgement = {
  canReceiveMedia: boolean;
  reason: EvolutionReceptionBlockReason | null;
};

// Normalizes a configured expected ingress origin, dropping anything unusable.
//
// Only the origin is kept: a configured public URL may carry a path, and the
// path this ingress listens on is ours to decide, not the operator's.
export const readEvolutionIngressOrigins = (
  configured: readonly (string | null | undefined)[],
): string[] => {
  const origins = new Set<string>();

  for (const value of configured) {
    if (typeof value !== 'string' || value.trim() === '') continue;

    try {
      const url = new URL(value.trim());

      if (url.protocol === 'https:' || url.protocol === 'http:')
        origins.add(url.origin);
    } catch {
      // A malformed configured origin is dropped rather than half-matched. If
      // that leaves no origin at all, reception stays unproven.
      continue;
    }
  }

  return [...origins];
};

// Does the reported webhook URL address this exact deployment, ingress path and
// connection?
//
// The origin is required, and that is the point of this check. A webhook whose
// path and connection id are right but whose origin is someone else's host sends
// every delivery to that host: nothing reaches us, so reception is false. The
// expected origin is configured (SERVER_URL, or an explicit allowlist) and is
// never guessed — with none configured the caller refuses with
// INGRESS_ORIGIN_UNKNOWN instead of accepting any host.
const addressesThisIngress = (
  reported: string,
  connectionId: string,
  origins: readonly string[],
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

  if (!origins.includes(url.origin)) {
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
  // The expected public ingress origin(s) for this deployment, already
  // normalized. Empty means none was configured, and reception then stays
  // unproven: no origin is ever inferred from a provider answer.
  ingressOrigins: readonly string[];
  webhook: EvolutionWebhookConfiguration;
  // What the provider reports it will send as our delivery token. Computed by
  // the caller through a delegated comparison, so no secret reaches this
  // judgement or its result.
  ingressToken: EvolutionIngressTokenEvidence;
}): EvolutionReceptionJudgement => {
  if (!evidence.versionVerified) {
    return { canReceiveMedia: false, reason: 'PROVIDER_VERSION_UNVERIFIED' };
  }

  if (evidence.ingressConnectionId === null) {
    return { canReceiveMedia: false, reason: 'INGRESS_NOT_IDENTIFIED' };
  }

  if (evidence.ingressOrigins.length === 0) {
    return { canReceiveMedia: false, reason: 'INGRESS_ORIGIN_UNKNOWN' };
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

  // Before the URL is trusted, establish that the URL is the destination. With
  // a per-event segment appended, the configured URL is not what gets called,
  // so checking it would answer a question about the wrong address.
  const form = readEvolutionDeliveryForm(parsed.data.webhookByEvents);

  if (form !== 'SIMPLE') {
    return {
      canReceiveMedia: false,
      reason:
        form === 'PER_EVENT'
          ? 'WEBHOOK_PER_EVENT_PATH_NOT_SERVED'
          : 'WEBHOOK_DELIVERY_FORM_UNPROVEN',
    };
  }

  if (
    typeof parsed.data.url !== 'string' ||
    !addressesThisIngress(
      parsed.data.url,
      evidence.ingressConnectionId,
      evidence.ingressOrigins,
    )
  ) {
    return { canReceiveMedia: false, reason: 'WEBHOOK_URL_NOT_THIS_INGRESS' };
  }

  // Last, because it is the one our own ingress enforces. A delivery without an
  // accepted token is refused 401 before anything is stored, so a webhook that
  // is otherwise perfect still cannot receive.
  if (evidence.ingressToken !== 'MATCHED') {
    return {
      canReceiveMedia: false,
      reason:
        evidence.ingressToken === 'MISMATCHED'
          ? 'WEBHOOK_TOKEN_MISMATCHED'
          : evidence.ingressToken === 'NOT_CONFIGURED'
            ? 'WEBHOOK_TOKEN_NOT_CONFIGURED'
            : 'WEBHOOK_TOKEN_UNVERIFIABLE',
    };
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
