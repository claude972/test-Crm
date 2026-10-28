import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';
import { type ExtendedUIMessage } from 'kovaa-lab-shared/ai';

export const agentChatFetchedMessagesFamilyState = createAtomFamilyState<
  ExtendedUIMessage[],
  { threadId: string | null }
>({
  key: 'agentChatFetchedMessagesFamilyState',
  defaultValue: [],
});
