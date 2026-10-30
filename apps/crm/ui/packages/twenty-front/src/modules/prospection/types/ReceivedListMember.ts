import { type EmailsMetadata, type FullNameMetadata } from 'kovaa-lab-shared/types';

export type ReceivedListMemberPerson = {
  id: string;
  name: FullNameMetadata | null;
  emails: EmailsMetadata | null;
  jobTitle: string | null;
  companyId: string | null;
};

// Shape read from the messageListMember standard object. It links a list to a
// person and carries nothing else, so the qualification facts below are all
// derived from the person and from the opt-out register.
export type ReceivedListMember = {
  id: string;
  listId: string | null;
  personId: string | null;
  createdAt: string | null;
  person: ReceivedListMemberPerson | null;
  __typename: string;
};
