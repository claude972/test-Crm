import { type ExtendedUIMessagePart } from 'kovaa-lab-shared/ai';

import { type ThinkingStepPart } from '@/ai/types/ThinkingStepPart';

export type AssistantMessageRenderItem =
  | {
      type: 'thinking-steps';
      parts: ThinkingStepPart[];
    }
  | {
      type: 'part';
      part: ExtendedUIMessagePart;
    };
