// Whether an attachment can be opened.
//
// 'available' exists now that the private media read is wired: the server has
// imported the bytes into a scoped asset and a parent can serve them. It is
// still the parent that fetches — this module holds no URL and no bytes — so
// the strip offers a download only when a parent also supplied the callback
// that performs it.
export type HermesMailboxAttachmentAvailability =
  // The bytes exist as a private scoped asset and can be read through the
  // authenticated media operation.
  | { kind: 'available' }
  // The contract's earlier state: the file exists on the provider and needs a
  // private import before this application can serve it.
  | { kind: 'privateImportRequired' }
  // The provider itself says the file cannot be served.
  | { kind: 'unavailable'; reason: string | null }
  // No state came back. Not the same fact as "importable", and never shown as
  // one.
  | { kind: 'unknown' };

// One attachment, described but never fetched by this module.
//
// There is no URL here either. An attachment's bytes are reached through an
// authenticated operation that answers with a short-lived relative path, and
// turning that into something a browser can load is the parent's job. A module
// that held a URL would be one img tag away from fetching mail content off a
// remote host at open time.
export type HermesMailboxAttachment = {
  // A string, like every identifier in this module: IMAP identifiers overflow
  // a GraphQL integer, so nothing here is ever typed as a number.
  id: string;
  name: string | null;
  mimeType: string | null;
  // Absent rather than zero when the provider did not give a size. A real
  // 0-byte file is a known size; a missing figure is not.
  sizeBytes: number | null;
  availability: HermesMailboxAttachmentAvailability;
};

// An image embedded in a message body, after the parent has resolved it.
//
// The parent reads the private attachment through the authenticated operation
// and hands back a source this module can put in a src attribute. The module
// does not build it, does not guess it, and accepts only a source that cannot
// reach the network — see resolveHermesMailboxInlineImageSource.
export type HermesMailboxInlineImage = {
  // The Content-ID the body references, without the 'cid:' prefix.
  contentId: string;
  // Already resolved by the parent: a blob: or data:image/ source.
  resolvedSource: string;
};
