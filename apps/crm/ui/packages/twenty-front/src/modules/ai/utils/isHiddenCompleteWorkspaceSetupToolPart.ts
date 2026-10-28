import {
  type ExtendedUIMessagePart,
  isCompleteWorkspaceSetupToolPart,
} from 'kovaa-lab-shared/ai';

export const isHiddenCompleteWorkspaceSetupToolPart = (
  part: ExtendedUIMessagePart,
): boolean =>
  isCompleteWorkspaceSetupToolPart(part) &&
  part.state !== 'output-error' &&
  part.state !== 'output-denied';
