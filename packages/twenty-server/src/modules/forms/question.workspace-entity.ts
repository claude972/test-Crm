import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

export class QuestionWorkspaceEntity extends BaseWorkspaceEntity implements WorkspaceRelatedEntity {
  formId: string;
  title: string;
  kind: 'TEXT' | 'CHOICE' | 'DATE' | 'NUMBER' | 'BOOLEAN' | 'EMAIL' | 'PHONE' | 'RATING' | 'FILE' | 'MULTI_CHOICE';
  validations: Record<string, any> | null;
  properties: Record<string, any> | null;
  index: number;
  workspaceId: string;
}
