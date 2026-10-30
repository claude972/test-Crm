import { type EmailsMetadata, type FullNameMetadata } from 'kovaa-lab-shared/types';

export type CampaignAudienceMemberPerson = {
  id: string;
  name: FullNameMetadata | null;
  emails: EmailsMetadata | null;
  jobTitle: string | null;
  companyId: string | null;
};

// Shape read from the messageListMember standard object. It links a list to a
// person and carries nothing else, so the qualification facts below are all
// derived from the person and from the opt-out register.
export type CampaignAudienceMember = {
  id: string;
  listId: string | null;
  personId: string | null;
  createdAt: string | null;
  person: CampaignAudienceMemberPerson | null;
  __typename: string;
};
