// `direction` is in the contract but its value set is NOT published. The two
// conventional values are admitted and everything else stays unknown: a
// message shown as outgoing when the server said something this client cannot
// read would attribute a customer's words to the workspace.
export type MessagingInboxDirection =
  | { kind: 'inbound' }
  | { kind: 'outbound' }
  | { kind: 'unknown'; raw: string | null };

export const readMessagingInboxDirection = (
  value: unknown,
): MessagingInboxDirection => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const normalised = value.trim().toUpperCase();

  if (normalised === 'INBOUND') {
    return { kind: 'inbound' };
  }

  if (normalised === 'OUTBOUND') {
    return { kind: 'outbound' };
  }

  // Kept verbatim for the folded diagnostic. Not interpreted.
  return { kind: 'unknown', raw: value.trim().length > 0 ? value.trim() : null };
};
