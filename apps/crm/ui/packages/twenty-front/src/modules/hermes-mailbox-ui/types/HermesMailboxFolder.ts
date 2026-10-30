// The five folder roles this mailbox knows.
//
// A provider folder that maps to none of them is carried as its own entry with
// `role: null` and its server-given label, rather than being forced into one
// of these five.
export const HERMES_MAILBOX_FOLDER_ROLES = [
  'inbox',
  'sent',
  'drafts',
  'archive',
  'trash',
] as const;

export type HermesMailboxFolderRole =
  (typeof HERMES_MAILBOX_FOLDER_ROLES)[number];

export const isHermesMailboxFolderRole = (
  value: unknown,
): value is HermesMailboxFolderRole =>
  typeof value === 'string' &&
  (HERMES_MAILBOX_FOLDER_ROLES as readonly string[]).includes(value);

// A folder's two counters.
//
// `null` means the server did not give the figure, and the folder panel says
// so in words. It is never defaulted to 0: "no unread mail" and "we do not
// know how much unread mail there is" are different facts, and only one of
// them lets somebody stop looking.
export type HermesMailboxFolderCounts = {
  unread: number | null;
  total: number | null;
};

export type HermesMailboxFolder = {
  id: string;
  // One of the five roles, or null for a provider folder outside the set.
  role: HermesMailboxFolderRole | null;
  // Used only for a folder with no known role. A role-bearing folder takes its
  // translated name from the folder panel.
  label: string | null;
  counts: HermesMailboxFolderCounts;
};
