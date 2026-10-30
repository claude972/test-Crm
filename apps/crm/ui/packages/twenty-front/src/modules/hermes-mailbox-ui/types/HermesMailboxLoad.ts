// What a panel was able to learn, modelled so that no failure can be read as
// an empty mailbox.
//
// - 'loading': the answer is not in yet.
// - 'notConfigured': no provider is connected, so there is nothing to read.
//   An explicit fact with its own screen, never an empty list.
// - 'denied': the server refused. A refusal is an answer, not a hiccup.
// - 'pageExpired': the cursor this panel was holding is no longer valid. The
//   list is not empty and not broken; it has to be started again, and the
//   panel says exactly that.
// - 'unreadable': something came back that this client could not reduce to the
//   contract. 'missing' also covers an operation the deployment does not
//   expose yet.
// - 'ready': a usable value, which may legitimately be an empty list.
//
// `message` is a server-sourced diagnostic. Shown verbatim as a diagnostic
// line, never parsed into an outcome.
export type HermesMailboxLoad<TValue> =
  | { kind: 'loading' }
  | { kind: 'notConfigured' }
  | { kind: 'denied'; message: string | null }
  | { kind: 'pageExpired'; message: string | null }
  | {
      kind: 'unreadable';
      problem: 'missing' | 'malformed';
      message: string | null;
    }
  | { kind: 'ready'; value: TValue };
