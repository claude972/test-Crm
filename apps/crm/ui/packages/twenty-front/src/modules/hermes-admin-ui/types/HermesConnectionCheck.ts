// What a connection test is, and what it is not.
//
// Two different things get confused under the word « connecté », and this
// module exists to keep them apart — in the model, not only in the wording:
//
//   1. REACHABILITY. A read-only probe asked the provider a question that
//      changes nothing, and got an answer. That is a fact about one instant.
//      It sends no mail, no WhatsApp, and starts no campaign.
//
//   2. A PROVEN FLOW. A real exchange was recorded in the durable ledger: a
//      message actually arrived, or a provider actually accepted one. That is
//      the only thing that proves the channel carries traffic.
//
// Reachability does not imply a proven flow, and a proven flow in the past
// does not make a channel reachable now. Neither one is folded into the
// connection's configuration state: saving a configuration proves nothing at
// all, which is why a save can never produce either of these.

// The read-only operation a probe actually performs, per channel.
//
// Named operations rather than a boolean, because the operator is entitled to
// know what was dialled. Each one is an operation the real provider genuinely
// supports, and each one is read-only by construction — there is deliberately
// no probe that sends.
export const HERMES_CONNECTION_PROBES = [
  // Evolution's own instance-state read. It reports whether the WhatsApp
  // instance is paired; it posts no message.
  'EVOLUTION_INSTANCE_STATE',
  // IMAP: open the session, list the folders, ask the bound folder for its
  // status. Nothing is fetched, flagged, moved or deleted.
  'IMAP_LIST_STATUS',
  // SMTP: greeting, TLS negotiation and authentication, then QUIT. The
  // envelope is never opened: no MAIL FROM, no RCPT TO, no DATA, so no mail
  // can leave even by accident.
  'SMTP_LOGIN_ONLY',
] as const;

export type HermesConnectionProbe = (typeof HERMES_CONNECTION_PROBES)[number];

export const isHermesConnectionProbe = (
  value: unknown,
): value is HermesConnectionProbe =>
  typeof value === 'string' &&
  (HERMES_CONNECTION_PROBES as readonly string[]).includes(value);

// Every probe is read-only. This is asserted as a function rather than left as
// a comment so that adding a sending probe to the list breaks a test instead
// of quietly shipping.
export const doesHermesProbeSendAnything = (
  _probe: HermesConnectionProbe,
): false => false;

// Which channels this build can probe, and which it cannot.
//
// WhatsApp and the native mailbox have a read-only probe. The remaining slots
// of the settings centre do not — not because they are broken, but because no
// authorised read-only operation is published for them here. That is said
// plainly instead of leaving a test button that silently does nothing, and
// instead of reporting an absent operation as a provider failure.
export const HERMES_PROBE_BY_UI_KIND: Readonly<
  Record<string, readonly HermesConnectionProbe[]>
> = {
  WHATSAPP_EVOLUTION: ['EVOLUTION_INSTANCE_STATE'],
  // One mail binding, two directions, two distinct probes. Reception working
  // is not sending working, so they are never collapsed into one answer.
  EMAIL_IMAP: ['IMAP_LIST_STATUS'],
  EMAIL_SMTP: ['SMTP_LOGIN_ONLY'],
};

export const readHermesProbesForUiKind = (
  uiKind: string | null,
): readonly HermesConnectionProbe[] =>
  uiKind === null ? [] : (HERMES_PROBE_BY_UI_KIND[uiKind] ?? []);

export const isHermesKindProbable = (uiKind: string | null): boolean =>
  readHermesProbesForUiKind(uiKind).length > 0;

// The outcome of one read-only probe.
//
// 'reachable' carries the instant and the operation, because « joignable »
// without either is not a checkable claim. It carries no notion of success
// beyond that: the word verified does not appear in this type on purpose.
export type HermesConnectionCheckOutcome =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | {
      kind: 'reachable';
      probe: HermesConnectionProbe;
      checkedAt: Date;
      // What the provider answered, as named observations rather than prose:
      // the paired state, the folder that was found, the tool that was listed.
      observations: readonly string[];
    }
  // The provider answered, and said it is not ready to carry traffic. The
  // usual case is an Evolution instance whose WhatsApp pairing has not been
  // completed: the gateway is perfectly reachable and the channel still
  // cannot send. Folding this into 'reachable' would promise a working
  // channel; folding it into 'unreachable' would send the operator looking
  // for a network fault that does not exist.
  | {
      kind: 'reachable-not-ready';
      probe: HermesConnectionProbe;
      checkedAt: Date;
      reason: string;
    }
  | {
      kind: 'unreachable';
      probe: HermesConnectionProbe;
      checkedAt: Date | null;
      errorCode: string | null;
    }
  // The server saw the request and declined it — a permission, a revision that
  // had moved on. Nothing was dialled.
  | { kind: 'refused'; reason: string | null }
  // This build publishes no read-only probe for the channel. Not a failure and
  // not a provider problem: there is simply no authorised operation to call,
  // and pressing a button cannot invent one.
  | { kind: 'not-offered' }
  // Nothing is configured, so nothing was dialled. Distinct from a probe that
  // was never run: here there is no configuration for a probe to reach.
  | { kind: 'nothing-configured' }
  // The configuration changed while the probe was in flight, so the answer
  // describes credentials that are no longer the current ones. It is not
  // reported as a success or a failure of the current configuration.
  | { kind: 'connection-changed' }
  | { kind: 'session-replaced'; message: string | null }
  // The answer could not be read. It proves nothing, so it is neither a
  // success nor a failure, and it is never shown as either.
  | { kind: 'unconfirmed' };

// Whether this outcome establishes reachability at an instant. Deliberately
// the only predicate that returns true for a probe, and deliberately NOT
// named « isVerified »: nothing here verifies a connection.
export const isHermesConnectionReachable = (
  outcome: HermesConnectionCheckOutcome,
): boolean => outcome.kind === 'reachable';

// The flow a real exchange proved, read from the durable ledger.
//
// INBOUND_OBSERVED: a message genuinely arrived and was stored.
// OUTBOUND_ACCEPTED: a provider genuinely accepted one for delivery. That is
// acceptance, which is not delivery and not a read receipt — the ledger does
// not know those, so neither does this type.
export const HERMES_CONNECTION_FLOWS = [
  'INBOUND_OBSERVED',
  'OUTBOUND_ACCEPTED',
] as const;

export type HermesConnectionFlow = (typeof HERMES_CONNECTION_FLOWS)[number];

export const isHermesConnectionFlow = (
  value: unknown,
): value is HermesConnectionFlow =>
  typeof value === 'string' &&
  (HERMES_CONNECTION_FLOWS as readonly string[]).includes(value);

// What the ledger proved about one connection.
//
// 'none' is the honest default: no exchange has been recorded. 'unknown' is a
// ledger that could not be read, which is not the same as an empty one — an
// unread ledger must never be shown as « aucun échange ».
export type HermesConnectionFlowProof =
  | { kind: 'none' }
  | { kind: 'unknown' }
  | {
      kind: 'proven';
      // Each flow with the instant it was last observed at. A flow without a
      // readable instant is left out rather than dated to now.
      flows: readonly { flow: HermesConnectionFlow; observedAt: Date }[];
    };

// Whether a given flow was proven. Asked per flow on purpose: a channel that
// has received is not thereby a channel that can send.
export const isHermesConnectionFlowProven = (
  proof: HermesConnectionFlowProof,
  flow: HermesConnectionFlow,
): boolean =>
  proof.kind === 'proven' &&
  proof.flows.some((entry) => entry.flow === flow);

// The one function the screen reads a headline from, and the reason this
// module exists.
//
// It cannot return « connecté ». The vocabulary is: nothing configured,
// configured but nothing checked, reachable at an instant, a proven flow, or a
// failure. « Reachable » and « proven » are separate descriptors that can both
// be present, and neither replaces the other.
export type HermesConnectionStanding = {
  // Was a read-only probe answered, and when.
  reachability:
    | { kind: 'never-checked' }
    | { kind: 'reachable'; checkedAt: Date }
    | { kind: 'reachable-not-ready'; checkedAt: Date; reason: string }
    | { kind: 'unreachable'; checkedAt: Date | null; errorCode: string | null }
    | { kind: 'not-offered' }
    | { kind: 'nothing-configured' }
    | { kind: 'inconclusive' };
  // Did the ledger record a real exchange.
  proof: HermesConnectionFlowProof;
};

export const readHermesConnectionStanding = (
  outcome: HermesConnectionCheckOutcome,
  proof: HermesConnectionFlowProof,
): HermesConnectionStanding => {
  if (outcome.kind === 'reachable') {
    return {
      reachability: { kind: 'reachable', checkedAt: outcome.checkedAt },
      proof,
    };
  }

  if (outcome.kind === 'reachable-not-ready') {
    return {
      reachability: {
        kind: 'reachable-not-ready',
        checkedAt: outcome.checkedAt,
        reason: outcome.reason,
      },
      proof,
    };
  }

  if (outcome.kind === 'unreachable') {
    return {
      reachability: {
        kind: 'unreachable',
        checkedAt: outcome.checkedAt,
        errorCode: outcome.errorCode,
      },
      proof,
    };
  }

  if (outcome.kind === 'not-offered') {
    return { reachability: { kind: 'not-offered' }, proof };
  }

  if (outcome.kind === 'nothing-configured') {
    return { reachability: { kind: 'nothing-configured' }, proof };
  }

  // A refusal, a replaced session, a configuration that moved under the probe
  // and an unreadable answer all establish nothing about reachability. None of
  // them is a failure of the provider, so none is reported as « injoignable ».
  if (
    outcome.kind === 'refused' ||
    outcome.kind === 'session-replaced' ||
    outcome.kind === 'connection-changed' ||
    outcome.kind === 'unconfirmed'
  ) {
    return { reachability: { kind: 'inconclusive' }, proof };
  }

  return { reachability: { kind: 'never-checked' }, proof };
};

// Whether the screen may offer an action that actually sends something.
//
// Reachability alone is not enough to claim the channel works, but it is the
// gate for ATTEMPTING a send: dialling a provider nobody could reach would
// fail in front of the operator with no explanation. A proven flow is not
// required — requiring it would make the first send impossible.
export const canAttemptHermesSend = (
  standing: HermesConnectionStanding,
): boolean => standing.reachability.kind === 'reachable';
