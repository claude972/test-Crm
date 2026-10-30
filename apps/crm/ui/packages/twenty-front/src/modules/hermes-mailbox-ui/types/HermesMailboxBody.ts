// A message body as it arrived.
//
// The two shapes are not interchangeable. 'html' goes through the repository's
// sanitiser and the reader's own external-resource block before it reaches the
// DOM; 'text' is rendered as text and cannot carry markup at all. A body the
// provider did not give is `null`, which the reader says out loud instead of
// showing an empty message.
export type HermesMailboxBody =
  | { kind: 'html'; html: string }
  | { kind: 'text'; text: string };

// The trailing quoted history of a reply, kept apart from the body so the
// reader can fold it into a <details> instead of making every answer read as a
// transcript. Same two shapes, same treatment.
export type HermesMailboxQuote = HermesMailboxBody;
