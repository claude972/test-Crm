// Primary and additional emails are matched case-insensitively server side, so
// the client compares the same way.
export const normaliseProspectionEmail = (emailAddress: string) =>
  emailAddress.trim().toLowerCase();
