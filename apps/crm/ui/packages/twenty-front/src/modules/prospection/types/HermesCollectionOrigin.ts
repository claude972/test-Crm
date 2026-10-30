// How a collection reached this workspace. Two origins exist as a product
// fact — the authenticated entry point, and the manual JSON deposit kept on
// the screen as a second choice — but the PUBLISHED HermesImportBatch contract
// carries no field that tells them apart.
//
// So this list is the vocabulary the surface renders, and a collection's
// origin stays null until the contract publishes a discriminator. Null reads
// as "origin not published", never as 'manual-json': the manual form existing
// is not evidence that a given collection came through it.
export const HERMES_COLLECTION_ORIGINS = ['automatic', 'manual-json'] as const;

// The two kinds the server now publishes on the batch, mapped explicitly. A
// kind outside these two leaves the origin null and reads as "not published":
// the mapping is a table, never a transform, so a third kind cannot be
// silently rendered as one of these.
export const readHermesCollectionOriginKind = (
  kind: string | null,
): HermesCollectionOrigin | null =>
  kind === 'SIGNED_INTAKE'
    ? 'automatic'
    : kind === 'MANUAL'
      ? 'manual-json'
      : null;

export type HermesCollectionOrigin =
  (typeof HERMES_COLLECTION_ORIGINS)[number];

export const isHermesCollectionOrigin = (
  value: unknown,
): value is HermesCollectionOrigin =>
  typeof value === 'string' &&
  (HERMES_COLLECTION_ORIGINS as readonly string[]).includes(value);

// The provenance facts of one collection. Every field but `origin` comes from
// the published batch contract and is already read defensively upstream, so
// null here always means "the payload did not carry a usable value".
export type HermesCollectionProvenance = {
  // Null whenever the batch carried no origin, which is the case for every
  // collection staged before the server started recording one. Absent is
  // UNKNOWN, never 'manual-json'.
  origin: HermesCollectionOrigin | null;
  // Only a SIGNED_INTAKE batch carries these. receivedAt is the server's own
  // marker for when the entry point took it — never derived from collectedAt,
  // which the caller supplies.
  intakeConnectionId: string | null;
  intakeReceivedAt: string | null;
  sourceUrl: string | null;
  externalBatchId: string | null;
  fingerprint: string | null;
  // Who the server recorded as having staged the collection. An automatic
  // collection may legitimately carry none, so an absent actor proves nothing
  // about the origin and is never used to infer one.
  createdByUserId: string | null;
  collectedAt: string | null;
  createdAt: string | null;
};
