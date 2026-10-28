"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageChannelMessageAssociationMessageFolderWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageChannelMessageAssociationMessageFolderWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    messageChannelMessageAssociation;
    messageChannelMessageAssociationId;
    messageFolder;
    messageFolderId;
}
exports.MessageChannelMessageAssociationMessageFolderWorkspaceEntity = MessageChannelMessageAssociationMessageFolderWorkspaceEntity;
