import { type ObjectLiteral } from 'typeorm';

import { type ObjectRecord } from 'kovaa-lab-shared/types';

import { type RolePermissionConfig } from 'src/engine/kovaa-lab-orm/types/role-permission-config.type';
import { type WorkspaceRepository } from 'src/engine/kovaa-lab-orm/repository/workspace-repository';

export type WorkspaceTransactionScope = {
  workspaceId: string;
  getRepository: <T extends ObjectLiteral = ObjectRecord>(
    objectMetadataName: string,
    rolePermissionConfig?: RolePermissionConfig,
    repositoryOptions?: { shouldSkipEventEmission?: boolean },
  ) => WorkspaceRepository<T>;
  executeRawQuery: (
    sql: string,
    parameters?: unknown[],
  ) => Promise<Record<string, unknown>[]>;
  afterCommit: (callback: () => void | Promise<void>) => void;
};
