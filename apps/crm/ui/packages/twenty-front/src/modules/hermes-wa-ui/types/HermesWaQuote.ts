import { type HermesWaMediaKindRead } from '@/hermes-wa-ui/types/HermesWaMediaKind';

// The message a reply quotes. All three fields absent is a real case — a
// reply can point at a message this client never loaded — and it is said out
// loud rather than rendered as an empty strip.
export type HermesWaQuote = {
  // Untrusted text.
  authorLabel: string | null;
  // Already shortened by the caller if it wants it short: a silent cut here
  // would change what the customer is shown to have said.
  text: string | null;
  // What the quoted message carried when it had no text.
  mediaKind: HermesWaMediaKindRead | null;
};
