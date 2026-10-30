import { type ProspectionOppositionState } from '@/prospection/types/ProspectionOppositionState';

// One received row, reduced to the facts the model can actually answer.
export type ReceivedListMemberQualification = {
  memberId: string;
  personId: string | null;
  displayName: string | null;
  jobTitle: string | null;
  primaryEmail: string | null;
  companyId: string | null;
  companyName: string | null;
  opposition: ProspectionOppositionState;
};
