import { type RoleIdsBySource } from 'src/engine/kovaa-lab-orm/types/role-permission-config.type';

export const isDenyingRoleIdsBySource = (
  roleIdsBySource: RoleIdsBySource,
): boolean => {
  const roleIds = Object.values(roleIdsBySource).filter(
    (roleId) => roleId !== undefined,
  );

  return roleIds.length === 0 || roleIds.includes(null);
};
