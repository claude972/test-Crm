"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormResponseWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/twenty-orm/base.workspace-entity");
class FormResponseWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    formId;
    personId;
    companyId;
    answers;
    submittedAt;
    status;
    workspaceId;
}
exports.FormResponseWorkspaceEntity = FormResponseWorkspaceEntity;
