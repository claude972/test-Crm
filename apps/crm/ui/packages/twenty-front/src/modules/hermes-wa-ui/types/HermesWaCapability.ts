// Whether one capability — sending, receiving, recording — is open.
//
// The contract publishes all three as false until a provider is configured,
// so that is a real state with its own sentence, not a silent disabled
// button. `notConfigured` (never set up) stays apart from `unavailable`
// (set up and closed now): the next step differs, so the words differ.
export type HermesWaCapability =
  | { kind: 'available' }
  | { kind: 'notConfigured' }
  | { kind: 'unavailable'; reason: string | null };

// The default for every capability prop: a capability nobody confirmed is
// unavailable. Defaulting to available would promise a send.
export const HERMES_WA_NOT_CONFIGURED_CAPABILITY: HermesWaCapability = {
  kind: 'notConfigured',
};
