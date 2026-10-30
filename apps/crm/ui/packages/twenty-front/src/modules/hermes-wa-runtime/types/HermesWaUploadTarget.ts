// The answer of `hermesPrepareMediaUpload`.
//
// `uploadUrl` is a native quarantine target and never a provider URL. The raw
// bytes are PUT to it with exactly `contentType` — not a type this client
// thinks is better, and never multipart or base64.
//
// `expiresAt` is carried as the server's own string. It is shown, never parsed
// into a local clock decision: the server is the authority on whether a target
// has lapsed, and a browser whose clock is wrong would refuse a valid upload.
export type HermesWaUploadTarget = {
  assetId: string;
  uploadUrl: string;
  contentType: string;
  expiresAt: string | null;
};

// The answer of `hermesMediaRead`.
//
// `downloadPath` is a RELATIVE backend path. It needs the current session and
// lapses in about sixty seconds, so it is never put in a `src`: the bytes are
// fetched, wrapped in a revocable blob: URL, and that URL is what the library
// renders.
export type HermesWaMediaReadTarget = {
  downloadPath: string;
  expiresAt: string | null;
};

// One media's bytes, as this module's own state before it becomes the library's
// `HermesWaMediaSource`.
//
// `idle` is the state at mount, and it is not a failure: nothing has been
// asked for yet, because nothing is fetched without a human asking.
export type HermesWaMediaAccess =
  | { kind: 'idle' }
  | { kind: 'resolving' }
  | { kind: 'resolved'; objectUrl: string }
  // The read, the fetch or the blob failed. Distinct from `idle`: asking again
  // is reasonable here.
  | { kind: 'failed'; message: string | null }
  // The server refused the read. An authorisation answer, not a hiccup, so
  // nothing offers to retry it.
  | { kind: 'denied'; message: string | null };
