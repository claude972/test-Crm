import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';

// One conversation as the contract publishes it, reduced to what this client
// can actually assert.
//
// `channel` is nullable here although the contract always sends one: all
// channel values travel as Strings, so a value outside the published set is
// kept in `unknownChannel` rather than forced into WhatsApp or email.
//
// `personId` is optional. Null means this conversation is attached to no CRM
// contact — not that the contact is missing. The server never creates or
// merges a contact, and an ambiguous or archived match is deliberately not
// linked, so an absent link is an answer and not a gap to fill.
//
// `personMatchStatus` is published as a field but its value set is NOT. It is
// therefore shown verbatim and never interpreted.
//
// `subject` exists on the email channel only.
//
// botMode and botModeUpdatedAt are now in the deployed schema and are
// selected. They were deliberately left out while that part was marked
// "runtime follow-up pending", because asking for a field the deployed schema
// does not have fails the whole query and would have taken the inbox down.
//
// botMode is a String on the wire, so a value outside MANUAL/AUTO is kept as
// it came and read as unknown rather than forced into either.
//
// botOwnerUserWorkspaceId is published but not selected: the screen has no way
// to turn an id into a person, and a raw id would say nothing useful.
//
// botModeUpdatedAt is the grant epoch. It is shown as the moment the
// delegation last changed, never as proof that a reply was sent.
export type MessagingInboxConversation = {
  id: string;
  channel: MessagingInboxChannel | null;
  unknownChannel: string | null;
  providerConnectionId: string | null;
  // Provider-sourced. Untrusted text: displayed as text, never as markup.
  contactHandle: string | null;
  personId: string | null;
  personMatchStatus: string | null;
  subject: string | null;
  lastMessageAt: string | null;
  botMode: string | null;
  botModeUpdatedAt: string | null;
};
