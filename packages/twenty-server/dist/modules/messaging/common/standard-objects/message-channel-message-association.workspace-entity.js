"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageChannelMessageAssociationWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageChannelMessageAssociationWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    messageExternalId;
    messageThreadExternalId;
    direction;
    messageChannelId;
    message;
    messageId;
    messageFolders;
}
exports.MessageChannelMessageAssociationWorkspaceEntity = MessageChannelMessageAssociationWorkspaceEntity;
