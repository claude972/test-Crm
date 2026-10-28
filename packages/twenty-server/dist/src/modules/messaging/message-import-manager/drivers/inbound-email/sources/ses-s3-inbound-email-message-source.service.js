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
exports.SesS3InboundEmailMessageSourceService = void 0;
const common_1 = require("@nestjs/common");
const file_storage_interface_1 = require("src/engine/core-modules/file-storage/interfaces/file-storage.interface");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const inbound_email_parser_service_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service");
const inbound_email_storage_service_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-storage.service");
// SES receipt rules park the raw MIME in S3; the reference is the S3 object key
let SesS3InboundEmailMessageSourceService = class SesS3InboundEmailMessageSourceService {
    kovaaLabConfigService;
    inboundEmailStorageService;
    inboundEmailParserService;
    constructor(kovaaLabConfigService, inboundEmailStorageService, inboundEmailParserService) {
        this.kovaaLabConfigService = kovaaLabConfigService;
        this.inboundEmailStorageService = inboundEmailStorageService;
        this.inboundEmailParserService = inboundEmailParserService;
    }
    isConfigured() {
        return (this.kovaaLabConfigService.get('STORAGE_TYPE') === file_storage_interface_1.StorageDriverType.S_3);
    }
    async fetchMessage(reference) {
        const rawMessage = await this.inboundEmailStorageService.getRawMessage(reference);
        const { message } = await this.inboundEmailParserService.parse(rawMessage, reference);
        return message;
    }
    async cleanup(reference) {
        await this.inboundEmailStorageService.deleteRawMessage(reference);
    }
};
exports.SesS3InboundEmailMessageSourceService = SesS3InboundEmailMessageSourceService;
exports.SesS3InboundEmailMessageSourceService = SesS3InboundEmailMessageSourceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [kovaa_lab_config_service_1.KovaaLabCRMConfigService,
        inbound_email_storage_service_1.InboundEmailStorageService, typeof (_a = typeof inbound_email_parser_service_1.InboundEmailParserService !== "undefined" && inbound_email_parser_service_1.InboundEmailParserService) === "function" ? _a : Object])
], SesS3InboundEmailMessageSourceService);
