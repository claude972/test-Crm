import { type HermesInformationMethod } from '@/prospection/types/HermesInformationMethod';

// The row fields HermesCreateImportBatchInput accepts. Unknown fields are
// rejected by the server, so the client never sends anything else.
export type HermesImportRowInput = {
  email: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  website?: string;
  phone?: string;
};

export type HermesCreateImportBatchInput = {
  externalBatchId: string;
  name: string;
  sourceUrl: string;
  collectedAt: string;
  rows: HermesImportRowInput[];
};

export type HermesQualifyImportRowsInput = {
  batchId: string;
  rowIds: string[];
  professionalPurpose: string;
  privacyNoticeUrl: string;
  informationMethod: HermesInformationMethod;
};

export type HermesCreateCampaignDraftInput = {
  name: string;
  subject: string;
  rowIds: string[];
};
