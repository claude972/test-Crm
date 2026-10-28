import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

import type { MentionSearchResult } from '@/mention/types/MentionSearchResult';

export const isWorkspaceMemberMentionSearchResult = ({
  objectNameSingular,
}: Pick<MentionSearchResult, 'objectNameSingular'>) =>
  objectNameSingular === CoreObjectNameSingular.WorkspaceMember;
