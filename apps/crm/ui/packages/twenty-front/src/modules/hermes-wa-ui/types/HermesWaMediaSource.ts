// A media's bytes, already resolved by whoever owns the media API.
//
// The contract returns a relative backend path that needs a session header
// and lapses after sixty seconds, and a browser attaches no header to an
// <img> or <video>. So the parent fetches the bytes, makes a revocable blob:
// URL, and hands that over. Nothing here builds or guesses an address.
export type HermesWaMediaSource =
  // No access obtained. The media itself may be fine.
  | { kind: 'absent' }
  // The parent is fetching the bytes right now.
  | { kind: 'resolving' }
  | { kind: 'resolved'; objectUrl: string }
  // The sixty seconds are up, or the blob: URL was revoked. The bytes are not
  // gone — the access is — so asking again is the parent's move.
  | { kind: 'expired' };

// The default for every source prop: no access until someone proves
// otherwise.
export const HERMES_WA_ABSENT_MEDIA_SOURCE: HermesWaMediaSource = {
  kind: 'absent',
};
