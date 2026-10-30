import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import { type HermesCollectionProvenance } from '@/prospection/types/HermesCollectionOrigin';

// The provenance of one collection, gathered from the batch fields the
// contract does publish.
//
// `origin` is deliberately hard-coded to null and read from nothing. The
// published HermesImportBatch carries id, externalBatchId, fingerprint, name,
// sourceUrl, collectedAt, createdAt, createdByUserId and rows — and no origin
// discriminator. Reading a field name that is not in the contract would be
// guessing one, and inferring the origin from createdByUserId or from the
// presence of a sourceUrl would be inventing a rule the server never stated.
//
// This function is the single place to change when the contract publishes a
// discriminator. Everything above it already renders a null origin as "origin
// not published".
export const readHermesCollectionProvenance = (
  batch: HermesImportBatch,
): HermesCollectionProvenance => ({
  origin: null,
  sourceUrl: batch.sourceUrl,
  externalBatchId: batch.externalBatchId,
  fingerprint: batch.fingerprint,
  createdByUserId: batch.createdByUserId,
  collectedAt: batch.collectedAt,
  createdAt: batch.createdAt,
});
