import { type ObjectsPermissions } from 'kovaa-lab-shared/types';
import { type PermissionFlagType } from 'kovaa-lab-shared/constants';

export type UserWorkspacePermissions = {
  permissionFlags: Record<PermissionFlagType, boolean>;
  objectsPermissions: ObjectsPermissions;
};
