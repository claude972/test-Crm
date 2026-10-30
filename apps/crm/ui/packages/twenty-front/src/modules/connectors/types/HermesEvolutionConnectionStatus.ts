// The exact status set published by the backend for hermesEvolutionConnection.
// These are wire values and are never displayed raw.
//
// PROVIDER_REPORTED_OPEN is the one that needs care: it means the provider
// claims the line is open. It is NOT proof that a WhatsApp message will be
// accepted or delivered, so nothing in the UI may present it as a confirmed
// send capability.
export const HERMES_EVOLUTION_CONNECTION_STATUSES = [
  'NOT_CONFIGURED',
  'PROVIDER_REPORTED_OPEN',
  'CONNECTING',
  'DISCONNECTED',
  'UNAVAILABLE',
] as const;

export type HermesEvolutionConnectionStatus =
  (typeof HERMES_EVOLUTION_CONNECTION_STATUSES)[number];
