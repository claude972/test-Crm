// A payload this screen could not reduce to the contract. 'missing' is an
// absent or null payload — which also covers an operation the deployed schema
// does not expose yet. 'malformed' is a payload that came back in a shape the
// contract does not describe.
//
// Neither is ever rendered as an empty inbox.
export type MessagingInboxPayloadProblem = 'missing' | 'malformed';

// One page of a cursor-paginated list.
//
// `unreadableItemCount` is kept so the screen can say that something was
// dropped. An entry without an id cannot be opened or replied to, so it is not
// displayed as a half-entry — but it is counted, because silently shortening a
// list is the same lie as inventing one.
export type MessagingInboxPage<TItem> = {
  items: TItem[];
  nextCursor: string | null;
  unreadableItemCount: number;
};

export type MessagingInboxPayloadRead<TValue> =
  | { kind: 'read'; value: TValue }
  | { kind: 'unreadable'; problem: MessagingInboxPayloadProblem };
