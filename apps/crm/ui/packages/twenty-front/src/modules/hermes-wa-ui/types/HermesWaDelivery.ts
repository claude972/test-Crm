// The delivery state shown inside the bubble. ACCEPTED is a provider receipt
// and never a delivery, so no label reads as delivered and no bare tick is
// used — a tick is read as delivered. UNCONFIRMED is not a failure. A value
// outside the set stays unknown and is shown verbatim.
export const HERMES_WA_DELIVERY_STATES = [
  'RECEIVED',
  'ACCEPTED',
  'UNCONFIRMED',
  'FAILED',
] as const;

export type HermesWaDeliveryState = (typeof HERMES_WA_DELIVERY_STATES)[number];

export const isHermesWaDeliveryState = (
  value: unknown,
): value is HermesWaDeliveryState =>
  typeof value === 'string' &&
  (HERMES_WA_DELIVERY_STATES as readonly string[]).includes(value);

export type HermesWaDeliveryStateRead =
  | { kind: 'known'; state: HermesWaDeliveryState }
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaDeliveryState = (
  value: unknown,
): HermesWaDeliveryStateRead => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (isHermesWaDeliveryState(normalised)) {
    return { kind: 'known', state: normalised };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};

// `errorCode` is a diagnostic, shown as a label and never turned into an
// outcome.
export type HermesWaDelivery = {
  state: HermesWaDeliveryStateRead;
  errorCode: string | null;
};
