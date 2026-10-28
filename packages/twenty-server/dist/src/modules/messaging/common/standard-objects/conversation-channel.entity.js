"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationChannelEntity = void 0;
const conversation_channel_workspace_entity_1 = require("./conversation-channel.workspace-entity");
const workspace_scoped_repository_1 = require("src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository");
class ConversationChannelEntity extends workspace_scoped_repository_1.WorkspaceScopedRepository {
    constructor() {
        super(conversation_channel_workspace_entity_1.ConversationChannelWorkspaceEntity);
    }
}
exports.ConversationChannelEntity = ConversationChannelEntity;
