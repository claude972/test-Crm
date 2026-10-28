import { PermissionFlagType } from 'kovaa-lab-shared/constants';

export const CORE_PICTURE_UPLOAD_PERMISSION_FLAGS = [
  PermissionFlagType.UPLOAD_FILE,
  PermissionFlagType.WORKSPACE,
  PermissionFlagType.WORKSPACE_MEMBERS,
  PermissionFlagType.PROFILE_INFORMATION,
] as const;
