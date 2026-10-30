import {
  HERMES_CONNECTION_KINDS,
  type HermesConnection,
  type HermesConnectionKind,
} from '@/hermes-admin-ui/types/HermesConnection';

// One place in the connection centre. 'unregistered' is deliberately not
// shaped like a connection: no id, no state, no capabilities. It is the screen
// saying this channel could be set up and nothing is. The contract's rule — no
// registered connection means « Non configuré » — is honoured without ever
// fabricating a record the server did not send.
export type HermesConnectionSlot =
  | { kind: 'registered'; connection: HermesConnection }
  | { kind: 'unregistered'; connectionKind: HermesConnectionKind };

// Every channel the centre asks about, in the published order, for one company
// only. A channel with several registered connections shows them all; one with
// none shows a single unregistered slot. Connections whose kind this client
// does not recognise come last, kept rather than hidden.
export const buildHermesConnectionSlots = (
  connections: readonly HermesConnection[],
  companyId: string | null,
): readonly HermesConnectionSlot[] => {
  // No active company means no slots at all. A connection centre that did not
  // know which company it was setting up would be the most dangerous screen
  // in this product.
  if (companyId === null) {
    return [];
  }

  const owned = connections.filter(
    (connection) => connection.companyId === companyId,
  );

  const knownSlots = HERMES_CONNECTION_KINDS.flatMap(
    (connectionKind): HermesConnectionSlot[] => {
      const registered = owned.filter(
        (connection) => connection.kind === connectionKind,
      );

      if (registered.length === 0) {
        return [{ kind: 'unregistered', connectionKind }];
      }

      return registered.map((connection) => ({
        kind: 'registered' as const,
        connection,
      }));
    },
  );

  const unknownKindSlots: HermesConnectionSlot[] = owned
    .filter((connection) => connection.kind === null)
    .map((connection) => ({ kind: 'registered' as const, connection }));

  return [...knownSlots, ...unknownKindSlots];
};

// A stable key for a slot. An unregistered slot has no id, so it is keyed by
// the channel it stands for.
export const readHermesConnectionSlotKey = (
  slot: HermesConnectionSlot,
): string =>
  slot.kind === 'registered'
    ? `connection:${slot.connection.id}`
    : `unregistered:${slot.connectionKind}`;
