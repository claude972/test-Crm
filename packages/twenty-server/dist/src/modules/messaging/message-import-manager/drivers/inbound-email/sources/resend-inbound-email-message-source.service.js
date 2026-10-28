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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendInboundEmailMessageSourceService = void 0;
const common_1 = require("@nestjs/common");
const macro_1 = require("@lingui/core/macro");
const guards_1 = require("@sniptt/guards");
const emailing_domain_driver_exception_1 = require("src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception");
const resend_api_client_service_1 = require("src/engine/core-modules/emailing-domain/drivers/resend/services/resend-api-client.service");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const inbound_email_parser_service_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service");
// The reference is the email.received webhook's email id; the raw MIME is fetched through a pre-signed URL
let ResendInboundEmailMessageSourceService = class ResendInboundEmailMessageSourceService {
    kovaaLabConfigService;
    resendApiClientService;
    inboundEmailParserService;
    constructor(kovaaLabConfigService, resendApiClientService, inboundEmailParserService) {
        this.kovaaLabConfigService = kovaaLabConfigService;
        this.resendApiClientService = resendApiClientService;
        this.inboundEmailParserService = inboundEmailParserService;
    }
    isConfigured() {
        return (0, guards_1.isNonEmptyString)(this.kovaaLabConfigService.get('RESEND_API_KEY'));
    }
    async fetchMessage(reference) {
        const receivedEmail = await this.resendApiClientService.getReceivedEmail(reference);
        const downloadUrl = receivedEmail.raw?.download_url;
        if (!(0, guards_1.isNonEmptyString)(downloadUrl)) {
            throw new emailing_domain_driver_exception_1.EmailingDomainDriverException(`Received email ${reference} has no raw content download URL`, emailing_domain_driver_exception_1.EmailingDomainDriverExceptionCode.NOT_FOUND, {
                userFriendlyMessage: (0, macro_1.msg) `The received email content is no longer available.`,
            });
        }
        const rawMessage = await this.resendApiClientService.downloadRawEmail(downloadUrl);
        const { message } = await this.inboundEmailParserService.parse(rawMessage, reference);
        return message;
    }
    async cleanup(_reference) {
        // Resend retains received emails on their side; nothing to delete
    }
};
exports.ResendInboundEmailMessageSourceService = ResendInboundEmailMessageSourceService;
exports.ResendInboundEmailMessageSourceService = ResendInboundEmailMessageSourceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [kovaa_lab_config_service_1.KovaaLabCRMConfigService, typeof (_a = typeof resend_api_client_service_1.ResendApiClientService !== "undefined" && resend_api_client_service_1.ResendApiClientService) === "function" ? _a : Object, typeof (_b = typeof inbound_email_parser_service_1.InboundEmailParserService !== "undefined" && inbound_email_parser_service_1.InboundEmailParserService) === "function" ? _b : Object])
], ResendInboundEmailMessageSourceService);
