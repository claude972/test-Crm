import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

export class FormWorkspaceEntity extends BaseWorkspaceEntity implements WorkspaceRelatedEntity {
  name: string;
  description: string | null;
  fields: Record<string, any>;
  isActive: boolean;
  workspaceId: string;
}
