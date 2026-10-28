import { isDefined } from 'kovaa-lab-shared/utils';

import { type AiChatUserCreditsUsage } from '@/ai/types/AiChatUserCreditsUsage';

export const isAiChatUserCreditsExhausted = ({
  limitValue,
  consumedValue,
}: AiChatUserCreditsUsage): boolean =>
  isDefined(consumedValue) && consumedValue >= limitValue;
