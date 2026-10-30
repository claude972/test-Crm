import { type HermesImportBatch, type HermesImportRow } from '@/prospection/types/HermesImportBatch';

export type HermesCreateImportBatchResult = {
  // Null when the returned batch could not be read: the call may still have
  // staged it, which is what the screen says.
  batch: HermesImportBatch | null;
  // Null when the payload's replay flag was not a boolean. Unknown replay is
  // not the same as a first import.
  replay: boolean | null;
};

export type HermesQualifyImportRowsResult = {
  batchId: string | null;
  // Null when the payload carried no readable rows array.
  rows: HermesImportRow[] | null;
};

export type HermesCampaignDraftResult = {
  campaignId: string | null;
  listId: string | null;
  // 'DRAFT' is the only status the contract returns. Null covers anything
  // else, and nothing in the interface reads a null status as ready.
  status: 'DRAFT' | null;
  // The contract returns false. Null means the flag was unreadable; neither
  // one ever enables a send, because no send exists here.
  sendingAvailable: boolean | null;
};
