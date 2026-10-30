// The two values the contract allows for informationMethod. The field is
// required by HermesQualifyImportRowsInput, so there is no third, empty case.
export const HERMES_INFORMATION_METHODS = [
  'already-informed',
  'first-contact-notice',
] as const;

export type HermesInformationMethod =
  (typeof HERMES_INFORMATION_METHODS)[number];
