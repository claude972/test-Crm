import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';
export declare class ConversationChannelWorkspaceEntity extends BaseWorkspaceEntity implements WorkspaceRelatedEntity {
    messageThreadId: string;
    channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT';
    externalChannelId: string;
    status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
    isBotEnabled: boolean;
    autoResponseRules: string;
    lastActivityAt: Date;
    workspaceId: string;
    constructor(data: Partial<ConversationChannelWorkspaceEntity>);
}
