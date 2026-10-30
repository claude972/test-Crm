// What the client knows about one list, as opposed to what the list contains.
//
// 'read' is the only status that carries items. 'unreadable' covers both a
// payload that does not match the contract and an operation the deployed
// schema does not expose yet: in both cases the screen says unknown, never
// "no conversation".
export type MessagingInboxReadStatus =
  | 'loading'
  | 'read'
  | 'denied'
  | 'unreadable';
