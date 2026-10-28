"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageThreadTargetWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageThreadTargetWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    messageThread;
    messageThreadId;
    isAutomaticallyAssigned;
    isManuallyAssigned;
    targetPerson;
    targetPersonId;
    targetCompany;
    targetCompanyId;
    targetOpportunity;
    targetOpportunityId;
}
exports.MessageThreadTargetWorkspaceEntity = MessageThreadTargetWorkspaceEntity;
