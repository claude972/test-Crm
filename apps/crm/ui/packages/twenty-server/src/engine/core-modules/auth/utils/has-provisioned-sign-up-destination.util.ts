import {
  isWorkspaceProvisioned,
  type WorkspaceActivationStatus,
} from 'kovaa-lab-shared/workspace';

export const hasProvisionedSignUpDestination = (
  availableWorkspacesForSignUp: {
    workspace: { activationStatus: WorkspaceActivationStatus };
  }[],
): boolean =>
  availableWorkspacesForSignUp.some(({ workspace }) =>
    isWorkspaceProvisioned(workspace),
  );
