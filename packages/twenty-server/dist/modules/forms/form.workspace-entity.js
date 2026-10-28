"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/twenty-orm/base.workspace-entity");
class FormWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    name;
    description;
    fields;
    isActive;
    workspaceId;
}
exports.FormWorkspaceEntity = FormWorkspaceEntity;
