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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let AvailabilityService = class AvailabilityService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getAvailability(params) {
        // Logic to get availability
    }
    getAvailableSlots(params) {
        // Logic to get available slots
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _a : Object])
], AvailabilityService);
