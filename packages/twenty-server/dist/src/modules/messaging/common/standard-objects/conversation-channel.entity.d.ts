import { ConversationChannelWorkspaceEntity } from './conversation-channel.workspace-entity';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class ConversationChannelEntity extends WorkspaceScopedRepository<ConversationChannelWorkspaceEntity> {
    constructor();
}
