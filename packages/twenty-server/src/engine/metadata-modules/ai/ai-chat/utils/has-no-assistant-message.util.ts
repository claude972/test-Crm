import { type ExtendedUIMessage } from 'kovaa-lab-shared/ai';

export const hasNoAssistantMessage = (
  messages: Pick<ExtendedUIMessage, 'role'>[],
): boolean => messages.every((message) => message.role !== 'assistant');
