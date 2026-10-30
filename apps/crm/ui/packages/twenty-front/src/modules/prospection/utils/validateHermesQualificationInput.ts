import {
  HERMES_MAX_DRAFT_ROW_IDS,
  HERMES_MAX_QUALIFY_ROW_IDS,
  HERMES_PURPOSE_MAX_LENGTH,
  HERMES_PURPOSE_MIN_LENGTH,
} from '@/prospection/constants/HermesContractLimits';
import { type HermesInformationMethod } from '@/prospection/types/HermesInformationMethod';
import {
  type HermesCreateCampaignDraftInput,
  type HermesQualifyImportRowsInput,
} from '@/prospection/types/HermesImportInput';
import { type HermesInputIssue } from '@/prospection/types/HermesInputIssue';

export type HermesQualificationFormValues = {
  batchId: string;
  rowIds: string[];
  professionalPurpose: string;
  privacyNoticeUrl: string;
  informationMethod: HermesInformationMethod;
};

export type HermesQualificationValidation = {
  input: HermesQualifyImportRowsInput | null;
  issues: HermesInputIssue[];
};

// The notice URL must use HTTPS. Anything else, including a URL that does not
// parse, is refused here rather than sent.
const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateHermesQualificationInput = ({
  batchId,
  rowIds,
  professionalPurpose,
  privacyNoticeUrl,
  informationMethod,
}: HermesQualificationFormValues): HermesQualificationValidation => {
  const issues: HermesInputIssue[] = [];

  // The contract counts unique row ids, so the duplicates of a selection are
  // collapsed before the bound is checked.
  const uniqueRowIds = Array.from(new Set(rowIds));

  if (uniqueRowIds.length === 0) {
    issues.push({ key: 'rows', code: 'no-row-selected' });
  }

  if (uniqueRowIds.length > HERMES_MAX_QUALIFY_ROW_IDS) {
    issues.push({
      key: 'rows-too-many',
      code: 'too-many-rows-selected',
      count: uniqueRowIds.length,
      limit: HERMES_MAX_QUALIFY_ROW_IDS,
    });
  }

  const trimmedPurpose = professionalPurpose.trim();

  if (trimmedPurpose.length < HERMES_PURPOSE_MIN_LENGTH) {
    issues.push({
      key: 'purpose',
      code: 'purpose-too-short',
      count: trimmedPurpose.length,
      limit: HERMES_PURPOSE_MIN_LENGTH,
    });
  }

  if (trimmedPurpose.length > HERMES_PURPOSE_MAX_LENGTH) {
    issues.push({
      key: 'purpose',
      code: 'purpose-too-long',
      count: trimmedPurpose.length,
      limit: HERMES_PURPOSE_MAX_LENGTH,
    });
  }

  const trimmedPrivacyNoticeUrl = privacyNoticeUrl.trim();

  if (trimmedPrivacyNoticeUrl.length === 0) {
    issues.push({ key: 'privacy-notice', code: 'privacy-notice-required' });
  } else if (!isHttpsUrl(trimmedPrivacyNoticeUrl)) {
    issues.push({ key: 'privacy-notice', code: 'privacy-notice-not-https' });
  }

  if (issues.length > 0 || batchId.length === 0) {
    return { input: null, issues };
  }

  return {
    input: {
      batchId,
      rowIds: uniqueRowIds,
      professionalPurpose: trimmedPurpose,
      privacyNoticeUrl: trimmedPrivacyNoticeUrl,
      informationMethod,
    },
    issues,
  };
};

export type HermesCampaignDraftFormValues = {
  name: string;
  subject: string;
  // Already restricted to qualified rows by the caller: the contract makes
  // only qualified, unsuppressed recipients eligible.
  rowIds: string[];
};

export type HermesCampaignDraftValidation = {
  input: HermesCreateCampaignDraftInput | null;
  issues: HermesInputIssue[];
};

export const validateHermesCampaignDraftInput = ({
  name,
  subject,
  rowIds,
}: HermesCampaignDraftFormValues): HermesCampaignDraftValidation => {
  const issues: HermesInputIssue[] = [];

  const uniqueRowIds = Array.from(new Set(rowIds));

  if (uniqueRowIds.length === 0) {
    issues.push({ key: 'rows', code: 'no-qualified-row-selected' });
  }

  if (uniqueRowIds.length > HERMES_MAX_DRAFT_ROW_IDS) {
    issues.push({
      key: 'rows-too-many',
      code: 'too-many-rows-selected',
      count: uniqueRowIds.length,
      limit: HERMES_MAX_DRAFT_ROW_IDS,
    });
  }

  const trimmedName = name.trim();
  const trimmedSubject = subject.trim();

  if (trimmedName.length === 0) {
    issues.push({ key: 'name', code: 'draft-name-required' });
  }

  if (trimmedSubject.length === 0) {
    issues.push({ key: 'subject', code: 'draft-subject-required' });
  }

  if (issues.length > 0) {
    return { input: null, issues };
  }

  return {
    input: { name: trimmedName, subject: trimmedSubject, rowIds: uniqueRowIds },
    issues,
  };
};
