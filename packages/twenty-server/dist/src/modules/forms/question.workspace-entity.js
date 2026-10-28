"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/twenty-orm/base.workspace-entity");
class QuestionWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    formId;
    title;
    kind;
    validations;
    properties;
    index;
    workspaceId;
}
exports.QuestionWorkspaceEntity = QuestionWorkspaceEntity;
