import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';

// capabilities as published by hermesImportBatches. Null whenever the flag was
// not a readable boolean: an unknown capability is never treated as true.
export type HermesCapabilities = {
  smtpCampaignSending: boolean | null;
  trackingDefault: boolean | null;
  nativeCampaignDrafts: boolean | null;
};

export type HermesImportState = {
  batches: HermesImportBatch[];
  // Null when the payload carried no readable campaignIds array.
  campaignIds: string[] | null;
  capabilities: HermesCapabilities;
  // Entries of the batches array that carried no usable id.
  unreadableBatchCount: number;
};

// Why a payload could not be read. Shown as an unknown state, never as empty.
export type HermesPayloadProblem =
  | 'missing'
  | 'not-an-object'
  | 'unsupported-version'
  | 'unexpected-shape';

export type HermesPayloadRead<TValue> =
  | { kind: 'read'; value: TValue }
  | { kind: 'unreadable'; problem: HermesPayloadProblem };
