import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

export class ConversationChannelWorkspaceEntity extends BaseWorkspaceEntity implements WorkspaceRelatedEntity {
  messageThreadId: string;
  channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT';
  externalChannelId: string;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  isBotEnabled: boolean;
  autoResponseRules: string;
  lastActivityAt: Date;
  workspaceId: string;

  constructor(data: Partial<ConversationChannelWorkspaceEntity>) {
    super(data);
    this.messageThreadId = data.messageThreadId || '';
    this.channelType = data.channelType || 'EMAIL';
    this.externalChannelId = data.externalChannelId || '';
    this.status = data.status || 'OPEN';
    this.isBotEnabled = data.isBotEnabled || false;
    this.autoResponseRules = data.autoResponseRules || '';
    this.lastActivityAt = data.lastActivityAt || new Date();
    this.workspaceId = data.workspaceId || '';
  }
}