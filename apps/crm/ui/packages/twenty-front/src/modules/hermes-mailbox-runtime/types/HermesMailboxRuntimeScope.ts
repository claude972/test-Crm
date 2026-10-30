// The triple every per-message V4 operation takes.
//
// The UID is a string and travels with the UIDVALIDITY it was listed under.
// Neither is ever a number here: IMAP UIDs overflow a GraphQL Int, and a
// validity read apart from its UID is the mismatch the contract turns into an
// explicit error.
export type HermesMailboxRuntimeScope = {
  folder: string;
  uid: string;
  uidValidity: string;
};
