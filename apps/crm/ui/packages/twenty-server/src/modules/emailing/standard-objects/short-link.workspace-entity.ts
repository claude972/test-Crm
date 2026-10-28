import { BaseWorkspaceEntity } from 'src/engine/kovaa-lab-orm/base.workspace-entity';

export class ShortLinkWorkspaceEntity extends BaseWorkspaceEntity {
  authoredTemplateUrl: string;
  resolvedDestinationUrl: string;
  templateAndResolvedUrlHash: string;
}
