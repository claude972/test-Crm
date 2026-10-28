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
var FormService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormService = void 0;
// Form Service
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const form_entity_1 = require("./entities/form.entity");
const form_submission_entity_1 = require("./entities/form-submission.entity");
let FormService = FormService_1 = class FormService {
    formRepo;
    submissionRepo;
    logger = new common_1.Logger(FormService_1.name);
    constructor(formRepo, submissionRepo) {
        this.formRepo = formRepo;
        this.submissionRepo = submissionRepo;
    }
    async createForm(data) {
        this.logger.debug(`Creating new form: ${data.title}`);
        const form = this.formRepo.create({
            ...data,
            isActive: true,
        });
        return this.formRepo.save(form);
    }
    async getForm(id) {
        return this.formRepo.findOne({ where: { id } });
    }
    async listForms(workspaceId) {
        const where = {};
        if (workspaceId) {
            where.workspaceId = workspaceId;
        }
        return this.formRepo.find({ where });
    }
    async submitForm(formId, data, submitterEmail) {
        this.logger.debug(`Processing form submission for ${formId}`);
        const submission = this.submissionRepo.create({
            formId,
            data,
            submitterEmail,
            status: 'completed',
        });
        return this.submissionRepo.save(submission);
    }
    async getSubmissions(formId) {
        return this.submissionRepo.find({ where: { formId } });
    }
};
exports.FormService = FormService;
exports.FormService = FormService = FormService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(form_entity_1.FormEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(form_submission_entity_1.FormSubmissionEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FormService);
