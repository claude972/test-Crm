import { isDefined } from 'kovaa-lab-shared/utils';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';

import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';

const SUSPENDED_WORKSPACE_ACTIVATION_STATUSES: WorkspaceActivationStatus[] = [
  WorkspaceActivationStatus.SUSPENDED,
  WorkspaceActivationStatus.INACTIVE,
];

export const isWorkspaceSuspended = (
  workspace:
    | Pick<FlatWorkspace, 'activationStatus' | 'deletedAt'>
    | null
    | undefined,
): boolean =>
  isDefined(workspace) &&
  SUSPENDED_WORKSPACE_ACTIVATION_STATUSES.includes(
    workspace.activationStatus,
  ) &&
  !isDefined(workspace.deletedAt);
