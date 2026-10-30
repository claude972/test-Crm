import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import {
  type HermesCollectionProvenance,
  readHermesCollectionOriginKind,
} from '@/prospection/types/HermesCollectionOrigin';

// The provenance of one collection, gathered from the batch fields the
// contract does publish.
//
// `origin` is now published on the batch as {kind:'MANUAL'} or
// {kind:'SIGNED_INTAKE', connectionId, receivedAt}, and is read from there and
// from nowhere else. A batch staged before the server recorded one carries no
// origin and stays null — absent is UNKNOWN, not manual.
//
// It is never inferred: not from createdByUserId, not from the presence of a
// sourceUrl, and above all not from any prefix or name, which a caller
// supplies and could therefore forge.
export const readHermesCollectionProvenance = (
  batch: HermesImportBatch,
): HermesCollectionProvenance => ({
  origin: readHermesCollectionOriginKind(batch.originKind),
  intakeConnectionId: batch.originConnectionId,
  intakeReceivedAt: batch.originReceivedAt,
  sourceUrl: batch.sourceUrl,
  externalBatchId: batch.externalBatchId,
  fingerprint: batch.fingerprint,
  createdByUserId: batch.createdByUserId,
  collectedAt: batch.collectedAt,
  createdAt: batch.createdAt,
});
