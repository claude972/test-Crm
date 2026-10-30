import {
  HERMES_MAX_DRAFT_NAME_LENGTH,
  HERMES_MAX_DRAFT_SUBJECT_LENGTH,
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
  // Null until the operator picks one. The contract's input requires a value,
  // so an unanswered form is refused here rather than sent with a guess.
  informationMethod: HermesInformationMethod | null;
};

export type HermesQualificationValidation = {
  input: HermesQualifyImportRowsInput | null;
  issues: HermesInputIssue[];
};

// The notice URL must use HTTPS and carry no user info. A URL that does not
// parse is refused here rather than sent. The credentials check matters on its
// own: https://user:pass@host is valid HTTPS, and putting a secret in a URL
// that is shown to recipients would leak it.
const hasUrlCredentials = (value: string): boolean => {
  try {
    const parsed = new URL(value);

    return parsed.username.length > 0 || parsed.password.length > 0;
  } catch {
    return false;
  }
};

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

  if (informationMethod === null) {
    issues.push({
      key: 'information-method',
      code: 'information-method-required',
    });
  }

  const trimmedPrivacyNoticeUrl = privacyNoticeUrl.trim();

  if (trimmedPrivacyNoticeUrl.length === 0) {
    issues.push({ key: 'privacy-notice', code: 'privacy-notice-required' });
  } else if (!isHttpsUrl(trimmedPrivacyNoticeUrl)) {
    issues.push({ key: 'privacy-notice', code: 'privacy-notice-not-https' });
  } else if (hasUrlCredentials(trimmedPrivacyNoticeUrl)) {
    issues.push({
      key: 'privacy-notice',
      code: 'privacy-notice-has-credentials',
    });
  }

  if (
    issues.length > 0 ||
    batchId.length === 0 ||
    // Narrows for the input below: the guard above already recorded the issue.
    informationMethod === null
  ) {
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

  // The server caps the draft name at 200 characters; without this the 201st
  // was accepted here and refused there.
  if (trimmedName.length > HERMES_MAX_DRAFT_NAME_LENGTH) {
    issues.push({
      key: 'name-too-long',
      code: 'draft-name-too-long',
      count: trimmedName.length,
      limit: HERMES_MAX_DRAFT_NAME_LENGTH,
    });
  }

  if (trimmedSubject.length === 0) {
    issues.push({ key: 'subject', code: 'draft-subject-required' });
  }

  // Same bound as the name, and missed for the same reason: the 201st
  // character passed here and was refused by the server.
  if (trimmedSubject.length > HERMES_MAX_DRAFT_SUBJECT_LENGTH) {
    issues.push({
      key: 'subject-too-long',
      code: 'draft-subject-too-long',
      count: trimmedSubject.length,
      limit: HERMES_MAX_DRAFT_SUBJECT_LENGTH,
    });
  }

  if (issues.length > 0) {
    return { input: null, issues };
  }

  return {
    input: { name: trimmedName, subject: trimmedSubject, rowIds: uniqueRowIds },
    issues,
  };
};
