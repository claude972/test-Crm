import {
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';
import { parseHermesInstant } from '@/hermes-admin-ui/utils/parseHermesInstant';

// Pure readers from a server answer to what may be said. An answer that
// cannot be read becomes 'unconfirmed', which proves nothing; no shape of
// answer can produce « verified ».

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
};

// Named, non-sensitive facts only. Anything that is not a short printable
// string is dropped rather than rendered: the observation list is shown to the
// operator, so it is not a place to pass through whatever the server sent.
const readObservations = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const text = readText(entry);

    return text === null || text.length > 120 ? [] : [text];
  });
};

// What a result must describe to be shown.
//
// A probe answers about one configuration. Displaying it against another, or
// against a configuration that has since been rewritten, is how a green badge
// outlives the thing it was about.
export type HermesCheckScope = {
  connectionId: string | null;
  revision: string | null;
};

// The mail probe's answer.
//
// `hermesTestMailConnectionV4` returns `{kind, probe, outcome, checkedAt,
// connectionId, revision, observations, errorCode, emitted}`. The outcome is
// the server's own verdict and is never recomputed here.
export const readHermesMailCheckPayload = (
  payload: unknown,
  requested: HermesConnectionProbe,
  scope: HermesCheckScope,
): HermesConnectionCheckOutcome => {
  const record = readRecord(payload);

  if (record === null) {
    return { kind: 'unconfirmed' };
  }

  // The answer must be about the probe that was asked for. A reply describing
  // the other direction would otherwise be shown against this one — reporting
  // reception as proof that sending works, or the reverse.
  const probe = readText(record.probe);

  if (probe !== requested) {
    return { kind: 'unconfirmed' };
  }

  const outcome = readText(record.outcome);

  // The identity the server answered about must be the identity the screen
  // asked about. A mismatch is not shown as a verdict on either one.
  const answeredConnectionId = readText(record.connectionId);
  const answeredRevision =
    typeof record.revision === 'number'
      ? String(record.revision)
      : readText(record.revision);

  if (
    outcome !== 'NOT_CONFIGURED' &&
    scope.connectionId !== null &&
    (answeredConnectionId !== scope.connectionId ||
      (scope.revision !== null && answeredRevision !== scope.revision))
  ) {
    return { kind: 'connection-changed' };
  }
  const checkedAt = parseHermesInstant(
    typeof record.checkedAt === 'string' ? record.checkedAt : null,
  );

  if (outcome === 'NOT_CONFIGURED') {
    return { kind: 'nothing-configured' };
  }

  if (outcome === 'CONNECTION_CHANGED') {
    return { kind: 'connection-changed' };
  }

  if (outcome === 'UNREACHABLE') {
    return {
      kind: 'unreachable',
      probe: requested,
      checkedAt: checkedAt.kind === 'at' ? checkedAt.date : null,
      errorCode: readText(record.errorCode),
    };
  }

  if (outcome === 'REACHABLE') {
    // Reachability is a dated claim. An answer the server did not date cannot
    // be shown as « joignable le … », and a reachability without an instant is
    // not a checkable statement, so it stays unconfirmed.
    if (checkedAt.kind !== 'at') {
      return { kind: 'unconfirmed' };
    }

    return {
      kind: 'reachable',
      probe: requested,
      checkedAt: checkedAt.date,
      observations: readObservations(record.observations),
    };
  }

  // An outcome outside the published set. It is not mapped onto one of them:
  // guessing would show a verdict the server never gave.
  return { kind: 'unconfirmed' };
};

// The WhatsApp probe's answer, from the existing read-only instance-state
// query. Its three-layer reality is preserved: the gateway can answer
// perfectly while the WhatsApp pairing is unfinished.
export const readHermesEvolutionCheckPayload = (
  payload: unknown,
): HermesConnectionCheckOutcome => {
  const record = readRecord(payload);

  if (record === null) {
    return { kind: 'unconfirmed' };
  }

  const status = readText(record.status);
  const checkedAt = parseHermesInstant(
    typeof record.checkedAt === 'string' ? record.checkedAt : null,
  );

  if (status === 'NOT_CONFIGURED') {
    return { kind: 'nothing-configured' };
  }

  if (status === 'UNAVAILABLE') {
    return {
      kind: 'unreachable',
      probe: 'EVOLUTION_INSTANCE_STATE',
      checkedAt: checkedAt.kind === 'at' ? checkedAt.date : null,
      errorCode: readText(record.errorCode),
    };
  }

  if (checkedAt.kind !== 'at') {
    return { kind: 'unconfirmed' };
  }

  // The gateway answered and the instance is not linked. The channel cannot
  // carry traffic, and the operator needs to know it is a pairing to finish
  // rather than a network fault to chase.
  if (status === 'CONNECTING' || status === 'DISCONNECTED') {
    return {
      kind: 'reachable-not-ready',
      probe: 'EVOLUTION_INSTANCE_STATE',
      checkedAt: checkedAt.date,
      reason: status,
    };
  }

  if (status === 'PROVIDER_REPORTED_OPEN') {
    const providerState = readText(record.providerState);

    return {
      kind: 'reachable',
      probe: 'EVOLUTION_INSTANCE_STATE',
      checkedAt: checkedAt.date,
      observations:
        providerState === null ? [] : [`instance:${providerState}`],
    };
  }

  return { kind: 'unconfirmed' };
};
