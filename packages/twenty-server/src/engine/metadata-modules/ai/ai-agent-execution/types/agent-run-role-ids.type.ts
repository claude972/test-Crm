import { type RoleIdsBySource } from 'src/engine/kovaa-lab-orm/types/role-permission-config.type';

export type AgentRunRoleIds = Omit<RoleIdsBySource, 'agentRoleId'>;
