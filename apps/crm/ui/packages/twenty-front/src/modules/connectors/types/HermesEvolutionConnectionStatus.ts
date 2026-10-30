// The exact status set published by the backend for hermesEvolutionConnection.
// These are wire values and are never displayed raw.
//
// PROVIDER_REPORTED_OPEN is the one that needs care: it means the provider
// claims its own line is open. It is not proof that a WhatsApp message will be
// accepted or delivered, so no label may present it as a send capability.
export const HERMES_EVOLUTION_CONNECTION_STATUSES = [
  'NOT_CONFIGURED',
  'PROVIDER_REPORTED_OPEN',
  'CONNECTING',
  'DISCONNECTED',
  'UNAVAILABLE',
] as const;

export type HermesEvolutionConnectionStatus =
  (typeof HERMES_EVOLUTION_CONNECTION_STATUSES)[number];

// The query is not in the generated schema yet, so the payload is unchecked at
// compile time. A status outside the published set means the client does not
// know what the server is reporting, and guessing a presentation for it would
// invent a state. Callers turn a false result into an unknown read.
export const isHermesEvolutionConnectionStatus = (
  value: unknown,
): value is HermesEvolutionConnectionStatus =>
  typeof value === 'string' &&
  (HERMES_EVOLUTION_CONNECTION_STATUSES as readonly string[]).includes(value);
