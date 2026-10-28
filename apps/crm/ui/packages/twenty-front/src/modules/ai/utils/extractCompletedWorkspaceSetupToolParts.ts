import {
  type ExtendedUIMessagePart,
  isSucceededCompleteWorkspaceSetupToolPart,
} from 'kovaa-lab-shared/ai';

export const extractCompletedWorkspaceSetupToolParts = (
  messageParts: ExtendedUIMessagePart[],
): { toolCallId: string }[] =>
  messageParts
    .filter(isSucceededCompleteWorkspaceSetupToolPart)
    .map((part) => ({ toolCallId: part.toolCallId }));
