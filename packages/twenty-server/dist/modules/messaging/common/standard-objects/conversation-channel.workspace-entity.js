"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationChannelWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/twenty-orm/base.workspace-entity");
class ConversationChannelWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    messageThreadId;
    channelType;
    externalChannelId;
    status;
    isBotEnabled;
    autoResponseRules;
    lastActivityAt;
    workspaceId;
    constructor(data) {
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
exports.ConversationChannelWorkspaceEntity = ConversationChannelWorkspaceEntity;
