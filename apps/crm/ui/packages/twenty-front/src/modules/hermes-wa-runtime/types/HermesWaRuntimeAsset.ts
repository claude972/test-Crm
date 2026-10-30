// One `HermesMediaAsset` as the media contract publishes it:
// `{id, kind, filename, mimeType, size, status}`. No file storage id, no key,
// no provider URL and no base64 — the contract states none of those are ever
// exposed, so none of them has a field here to land in.
//
// Every field but the id is nullable on this side: `kind` and `status` travel
// as Strings, so a value outside the documented vocabulary is kept verbatim
// rather than guessed into one, and a field the deployed schema answers with
// the wrong type reads as absent instead of as a repaired value.
export type HermesWaRuntimeAsset = {
  id: string;
  // The server's own word. Documented: IMAGE, VIDEO, AUDIO, FILE.
  rawKind: string | null;
  // Provider-sourced or operator-sourced. Untrusted text.
  filename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  // The server's own word. Documented: PENDING, READY, ATTACHED, REVOKED.
  rawStatus: string | null;
};
