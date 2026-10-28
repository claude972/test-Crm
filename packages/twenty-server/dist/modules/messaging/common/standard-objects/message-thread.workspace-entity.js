"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageThreadWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class MessageThreadWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    subject;
    messages;
    messageThreadTargets;
}
exports.MessageThreadWorkspaceEntity = MessageThreadWorkspaceEntity;
