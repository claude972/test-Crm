import { type HermesWaMediaKindRead } from '@/hermes-wa-ui/types/HermesWaMediaKind';
import { type HermesWaMediaStateRead } from '@/hermes-wa-ui/types/HermesWaMediaState';

// A descriptor, with no address of any kind — no url, no path, no token. The
// contract returns a relative backend path needing a session header, so an
// address here would only invite a `src` that cannot work. The bytes travel
// separately as a HermesWaMediaSource the parent resolved.
// Nullable fields stay absent on screen: never zero, never an empty string.
export type HermesWaMedia = {
  id: string;
  kind: HermesWaMediaKindRead;
  state: HermesWaMediaStateRead;
  // Untrusted text, displayed as text.
  name: string | null;
  byteSize: number | null;
  mimeType: string | null;
  // The sender's own description. Never fabricated.
  alt: string | null;
  durationMs: number | null;
  // A server diagnostic, shown verbatim and never parsed into a state.
  errorCode: string | null;
};
