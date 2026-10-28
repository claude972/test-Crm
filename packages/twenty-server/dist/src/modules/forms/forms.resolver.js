"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const forms_workspace_service_1 = require("./forms.workspace-service");
const form_workspace_entity_1 = require("./form.workspace-entity");
const form_response_workspace_entity_1 = require("./form-response.workspace-entity");
let FormsResolver = class FormsResolver {
    formsService;
    constructor(formsService) {
        this.formsService = formsService;
    }
    async createForm(data) {
        return this.formsService.createForm(data);
    }
    async submitResponse(data) {
        return this.formsService.submitResponse(data);
    }
    async listResponses(formId, workspaceId) {
        return this.formsService.listResponses(formId, workspaceId);
    }
};
exports.FormsResolver = FormsResolver;
__decorate([
    (0, graphql_1.Mutation)(() => form_workspace_entity_1.FormWorkspaceEntity),
    __param(0, (0, graphql_1.Args)('data')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FormsResolver.prototype, "createForm", null);
__decorate([
    (0, graphql_1.Mutation)(() => form_response_workspace_entity_1.FormResponseWorkspaceEntity),
    __param(0, (0, graphql_1.Args)('data')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FormsResolver.prototype, "submitResponse", null);
__decorate([
    (0, graphql_1.Query)(() => [form_response_workspace_entity_1.FormResponseWorkspaceEntity]),
    __param(0, (0, graphql_1.Args)('formId')),
    __param(1, (0, graphql_1.Args)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FormsResolver.prototype, "listResponses", null);
exports.FormsResolver = FormsResolver = __decorate([
    (0, graphql_1.Resolver)(() => form_workspace_entity_1.FormWorkspaceEntity),
    __metadata("design:paramtypes", [forms_workspace_service_1.FormsWorkspaceService])
], FormsResolver);
