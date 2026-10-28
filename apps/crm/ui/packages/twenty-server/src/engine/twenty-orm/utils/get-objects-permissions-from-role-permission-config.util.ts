import {
  type ObjectsPermissions,
  type ObjectsPermissionsByRoleId,
} from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type RolePermissionConfig } from 'src/engine/kovaa-lab-orm/types/role-permission-config.type';
import { computePermissionIntersection } from 'src/engine/kovaa-lab-orm/utils/compute-permission-intersection.util';
import { getRoleIdsToIntersect } from 'src/engine/kovaa-lab-orm/utils/get-role-ids-to-intersect.util';

export const getObjectsPermissionsFromRolePermissionConfig = ({
  rolesPermissions,
  rolePermissionConfig,
}: {
  rolesPermissions: ObjectsPermissionsByRoleId;
  rolePermissionConfig: RolePermissionConfig;
}): ObjectsPermissions => {
  if ('shouldBypassPermissionChecks' in rolePermissionConfig) {
    return {};
  }

  const roleIds = getRoleIdsToIntersect(rolePermissionConfig.intersectionOf);

  if (!isDefined(roleIds)) {
    return {};
  }

  const permissionsPerRole = roleIds.map((roleId) => rolesPermissions[roleId]);

  if (!permissionsPerRole.every(isDefined)) {
    return {};
  }

  return computePermissionIntersection(permissionsPerRole);
};
