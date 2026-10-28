import { type ProposedToolCall } from 'kovaa-lab-shared/ai';

export type ProposedToolCallResolution =
  | { proposal: ProposedToolCall }
  | { error: string };
