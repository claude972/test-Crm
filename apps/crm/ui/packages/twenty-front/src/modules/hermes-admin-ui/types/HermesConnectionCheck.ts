// Keeps two notions apart that « connecté » confuses: REACHABILITY, a
// read-only probe answered at one instant, and a PROVEN FLOW, a real exchange
// in the durable ledger. Neither implies the other, and neither follows from
// saving a configuration.

// The read-only operation each probe performs. Named rather than a boolean so
// the operator knows what was dialled. Every one is an operation the real
// provider supports, and none of them sends.
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

// Which channels this build can probe. The other slots have no published
// read-only operation here, which is said plainly rather than left as a test
// button that silently does nothing.
export const HERMES_PROBE_BY_UI_KIND: Readonly<
  Record<string, readonly HermesConnectionProbe[]>
> = {
  WHATSAPP_EVOLUTION: ['EVOLUTION_INSTANCE_STATE'],
  // The mail binding is ONE native connected account carrying both
  // directions, so the slot backed by that record tests both. They stay two
  // distinct probes reported as two distinct answers: reception working is not
  // sending working, and one verdict would hide a broken direction behind a
  // working one. The wording names each direction, so nothing is conflated.
  EMAIL_IMAP: ['IMAP_LIST_STATUS', 'SMTP_LOGIN_ONLY'],
  // The outgoing slot has no central record of its own — the native account
  // owns the SMTP credentials. It is listed here so that, where it is shown,
  // the test it offers is the sending one and not the receiving one.
  EMAIL_SMTP: ['SMTP_LOGIN_ONLY'],
};

export const readHermesProbesForUiKind = (
  uiKind: string | null,
): readonly HermesConnectionProbe[] =>
  uiKind === null ? [] : (HERMES_PROBE_BY_UI_KIND[uiKind] ?? []);

export const isHermesKindProbable = (uiKind: string | null): boolean =>
  readHermesProbesForUiKind(uiKind).length > 0;

// What a result was computed under.
//
// A probe answers about one configuration of one company. Shown against any
// other, or against one since rewritten, a result outlives what it described.
export type HermesCheckTarget = {
  companyId: string | null;
  connectionId: string;
  revision: string | null;
};

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
  // The provider answered and is not ready to carry traffic — usually an
  // Evolution instance whose WhatsApp pairing is unfinished. Neither
  // 'reachable' nor 'unreachable' would be true of it.
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

// The flow a real exchange proved, from the durable ledger. OUTBOUND_ACCEPTED
// is a provider accepting for delivery: acceptance, not delivery and not a
// read receipt.
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

// The headline the screen reads. It cannot return « connecté »: reachability
// and proof are separate descriptors that can both be present, and neither
// replaces the other.
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

// The gate for ATTEMPTING a send. Reachability is required so a send is not
// offered against a provider nobody could reach; a proven flow is not, since
// requiring it would make the first send impossible.
export const canAttemptHermesSend = (
  standing: HermesConnectionStanding,
): boolean => standing.reachability.kind === 'reachable';
