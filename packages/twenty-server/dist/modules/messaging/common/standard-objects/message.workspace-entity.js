"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    headerMessageId;
    subject;
    text;
    receivedAt;
    messageThread;
    messageThreadId;
    messageParticipants;
    messageChannelMessageAssociations;
    messageCampaign;
    messageCampaignId;
    isDraft;
}
exports.MessageWorkspaceEntity = MessageWorkspaceEntity;
