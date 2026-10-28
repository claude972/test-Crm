"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageParticipantWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageParticipantWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    role;
    handle;
    displayName;
    message;
    messageId;
    person;
    personId;
    workspaceMember;
    workspaceMemberId;
    messageCampaign;
    messageCampaignId;
}
exports.MessageParticipantWorkspaceEntity = MessageParticipantWorkspaceEntity;
