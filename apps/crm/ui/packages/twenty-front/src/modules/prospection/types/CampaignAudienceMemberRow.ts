import { type ProspectionSuppressionEntry } from '@/prospection/types/ProspectionSuppressionEntry';

// One audience member, reduced to the facts the model can actually answer.
export type CampaignAudienceMemberRow = {
  memberId: string;
  personId: string | null;
  displayName: string | null;
  jobTitle: string | null;
  primaryEmail: string | null;
  companyId: string | null;
  companyName: string | null;
  // Register entries for this address, carried as they are. No flag here says
  // whether a send is allowed: reason and topic scope decide that, server side.
  suppressions: ProspectionSuppressionEntry[];
  // False while the register is only partly read, which makes the absence of
  // an entry unknown rather than clear.
  isSuppressionAbsenceKnown: boolean;
};
