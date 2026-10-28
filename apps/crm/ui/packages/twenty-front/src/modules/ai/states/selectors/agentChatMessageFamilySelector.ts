import { agentChatDisplayedThreadMessagesSelector } from '@/ai/states/selectors/agentChatDisplayedThreadMessagesSelector';
import { createAtomFamilySelector } from '@/ui/utilities/state/jotai/utils/createAtomFamilySelector';
import { type ExtendedUIMessage } from 'kovaa-lab-shared/ai';
import { type Nullable } from 'kovaa-lab-shared/types';

export const agentChatMessageFamilySelector = createAtomFamilySelector<
  Nullable<ExtendedUIMessage>,
  { messageId: Nullable<string> }
>({
  key: 'agentChatMessageFamilySelector',
  get:
    ({ messageId }) =>
    ({ get }) =>
      get(agentChatDisplayedThreadMessagesSelector).find(
        (message) => message.id === messageId,
      ),
});
