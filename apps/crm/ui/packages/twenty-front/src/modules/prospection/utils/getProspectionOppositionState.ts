import { isNonEmptyString } from '@sniptt/guards';

import {
  type ProspectionOppositionCoverage,
  type ProspectionOppositionState,
} from '@/prospection/types/ProspectionOppositionState';

type GetProspectionOppositionStateArgs = {
  primaryEmail: string | null;
  // Addresses read from the opt-out register, already normalised.
  optedOutEmails: Set<string>;
  coverage: ProspectionOppositionCoverage;
};

export const normaliseProspectionEmail = (emailAddress: string) =>
  emailAddress.trim().toLowerCase();

// An address is only called reachable when the whole register was read and it
// is not in it. With a partly read register, absence proves nothing.
export const getProspectionOppositionState = ({
  primaryEmail,
  optedOutEmails,
  coverage,
}: GetProspectionOppositionStateArgs): ProspectionOppositionState => {
  const trimmedEmail = primaryEmail?.trim();

  if (!isNonEmptyString(trimmedEmail)) {
    return 'unknown';
  }

  if (optedOutEmails.has(normaliseProspectionEmail(trimmedEmail))) {
    return 'opted-out';
  }

  return coverage === 'complete' ? 'reachable' : 'unknown';
};
