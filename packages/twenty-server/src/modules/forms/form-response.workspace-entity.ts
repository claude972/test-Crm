import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

export class FormResponseWorkspaceEntity extends BaseWorkspaceEntity implements WorkspaceRelatedEntity {
  formId: string;
  personId: string | null;
  companyId: string | null;
  answers: Record<string, any>;
  submittedAt: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  workspaceId: string;
}
