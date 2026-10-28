"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormsWorkspaceService = void 0;
const common_1 = require("@nestjs/common");
let FormsWorkspaceService = class FormsWorkspaceService {
    async createForm(data) {
        const form = {
            id: crypto.randomUUID(),
            name: data.name,
            description: data.description,
            fields: data.fields || {},
            isActive: true,
            workspaceId: data.workspaceId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        };
        return form;
    }
    async submitResponse(data) {
        const response = {
            id: crypto.randomUUID(),
            formId: data.formId,
            personId: data.personId,
            companyId: data.companyId,
            answers: data.answers,
            submittedAt: new Date().toISOString(),
            status: 'SUBMITTED',
            workspaceId: data.workspaceId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        };
        return response;
    }
    async listResponses(formId, workspaceId) {
        // TODO: implement repository query with workspace isolation
        return [];
    }
};
exports.FormsWorkspaceService = FormsWorkspaceService;
exports.FormsWorkspaceService = FormsWorkspaceService = __decorate([
    (0, common_1.Injectable)()
], FormsWorkspaceService);
