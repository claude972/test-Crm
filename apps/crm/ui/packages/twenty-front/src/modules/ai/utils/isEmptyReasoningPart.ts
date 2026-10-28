import { type ExtendedUIMessagePart } from 'kovaa-lab-shared/ai';

// Providers that keep reasoning hidden still emit a finished reasoning part, with no text to show.
export const isEmptyReasoningPart = (part: ExtendedUIMessagePart): boolean =>
  part.type === 'reasoning' &&
  part.state !== 'streaming' &&
  part.text.trim().length === 0;
