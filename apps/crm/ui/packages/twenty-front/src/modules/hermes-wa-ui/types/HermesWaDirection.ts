// Which side of the conversation a message belongs to. Anything outside the
// two conventional values stays unknown, and an unknown direction is never
// laid out as outgoing: that would attribute a customer's words to the
// workspace, and the alignment is the whole point of this grammar.
export type HermesWaDirection =
  | { kind: 'inbound' }
  | { kind: 'outbound' }
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaDirection = (value: unknown): HermesWaDirection => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (normalised === 'INBOUND') {
    return { kind: 'inbound' };
  }

  if (normalised === 'OUTBOUND') {
    return { kind: 'outbound' };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};
