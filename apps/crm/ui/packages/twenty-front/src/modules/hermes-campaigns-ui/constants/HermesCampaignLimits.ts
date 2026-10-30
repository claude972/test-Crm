// Client-side bounds, kept in one place. They stop a call that would be
// refused anyway; they do not define what the server accepts, and none of
// them authorises anything.
export const HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH = 180;
export const HERMES_CAMPAIGN_BODY_MAX_LENGTH = 20000;

// Matches {{variable}} and captures the name. Kept deliberately narrow:
// letters, digits and underscores only, so a stray brace in prose is not read
// as a variable.
export const HERMES_CAMPAIGN_VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
