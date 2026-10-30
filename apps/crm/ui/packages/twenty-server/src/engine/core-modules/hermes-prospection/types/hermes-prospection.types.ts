export type HermesImportSourceRow = {
  email: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  website?: string;
  phone?: string;
};

export type HermesImportRowStatus =
  | 'pending'
  | 'invalid'
  | 'duplicate'
  | 'suppressed'
  | 'qualified'
  | 'conflict';

export type HermesImportRow = HermesImportSourceRow & {
  id: string;
  status: HermesImportRowStatus;
  errors: string[];
  personId?: string;
  companyId?: string;
  qualification?: {
    professionalPurpose: string;
    privacyNoticeUrl: string;
    informationMethod: 'already-informed' | 'first-contact-notice';
    qualifiedAt: string;
    qualifiedByUserId: string;
  };
};

export type HermesImportBatch = {
  id: string;
  externalBatchId: string;
  fingerprint: string;
  name: string;
  sourceUrl: string;
  collectedAt: string;
  createdAt: string;
  createdByUserId: string;
  origin?:
    | { kind: 'MANUAL' }
    | { kind: 'SIGNED_INTAKE'; connectionId: string; receivedAt: string };
  rows: HermesImportRow[];
};

export type HermesProspectionState = {
  version: 1;
  batches: HermesImportBatch[];
  campaignIds: string[];
};

export type HermesProspectionActor = {
  workspaceId: string;
  userId: string;
  userWorkspaceId: string;
};
