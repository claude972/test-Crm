// One failed client-side check, as a code rather than as a sentence: the
// bounds live in the contract, the wording lives in the component that renders
// them, so every message stays translatable in one place.
export type HermesIssueCode =
  | 'external-batch-id-required'
  | 'batch-name-required'
  | 'source-url-required'
  | 'source-url-not-http'
  | 'source-url-has-credentials'
  | 'collected-at-required'
  | 'collected-at-not-iso'
  | 'rows-required'
  | 'rows-not-json'
  | 'rows-not-array'
  | 'rows-too-many'
  | 'row-not-an-object'
  | 'row-phone-too-long'
  | 'row-field-not-a-string'
  | 'row-unknown-field'
  | 'state-too-large'
  | 'purpose-too-short'
  | 'purpose-too-long'
  | 'privacy-notice-required'
  | 'privacy-notice-not-https'
  | 'privacy-notice-has-credentials'
  | 'information-method-required'
  | 'no-row-selected'
  | 'too-many-rows-selected'
  | 'draft-name-required'
  | 'draft-name-too-long'
  | 'draft-subject-required'
  | 'draft-subject-too-long'
  | 'no-qualified-row-selected';

export type HermesInputIssue = {
  // Stable list key, unique within one validation pass.
  key: string;
  code: HermesIssueCode;
  // 1-based row number as pasted, for the row-level codes.
  row?: number;
  field?: string;
  count?: number;
  limit?: number;
};
