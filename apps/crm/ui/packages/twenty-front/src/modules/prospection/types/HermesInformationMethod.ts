// The two values the contract allows for informationMethod. The field is
// required by HermesQualifyImportRowsInput, so there is no third, empty case
// on the wire. The form holds null until the operator picks one, and refuses
// to submit rather than choosing on their behalf.
export const HERMES_INFORMATION_METHODS = [
  'already-informed',
  'first-contact-notice',
] as const;

export type HermesInformationMethod =
  (typeof HERMES_INFORMATION_METHODS)[number];
