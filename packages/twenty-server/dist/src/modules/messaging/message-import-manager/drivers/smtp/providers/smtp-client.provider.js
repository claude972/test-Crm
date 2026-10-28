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
exports.SmtpClientProvider = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nodemailer_1 = require("nodemailer");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const typeorm_2 = require("typeorm");
const build_mail_server_certificate_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-mail-server-certificate-options.util");
const build_smtp_tls_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-smtp-tls-options.util");
const secure_http_client_service_1 = require("src/engine/core-modules/secure-http-client/secure-http-client.service");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const connected_account_token_encryption_service_1 = require("src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service");
let SmtpClientProvider = class SmtpClientProvider {
    secureHttpClientService;
    kovaaLabConfigService;
    connectedAccountTokenEncryptionService;
    connectedAccountRepository;
    constructor(secureHttpClientService, kovaaLabConfigService, connectedAccountTokenEncryptionService, connectedAccountRepository) {
        this.secureHttpClientService = secureHttpClientService;
        this.kovaaLabConfigService = kovaaLabConfigService;
        this.connectedAccountTokenEncryptionService = connectedAccountTokenEncryptionService;
        this.connectedAccountRepository = connectedAccountRepository;
    }
    async getClient(connectedAccountId) {
        const connectedAccount = await this.connectedAccountRepository.findOne({
            where: { id: connectedAccountId },
        });
        if (!(0, utils_1.isDefined)(connectedAccount)) {
            throw new Error(`Connected account ${connectedAccountId} not found while opening SMTP client`);
        }
        if (connectedAccount.provider !== types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV ||
            !(0, utils_1.isDefined)(connectedAccount.connectionParameters?.SMTP)) {
            throw new Error('Connected account is not an SMTP provider');
        }
        const smtpParams = this.connectedAccountTokenEncryptionService.decryptProtocolPassword({
            protocolParams: connectedAccount.connectionParameters.SMTP,
            workspaceId: connectedAccount.workspaceId,
        });
        const validatedSmtpHost = await this.secureHttpClientService.getValidatedHost(smtpParams.host);
        const options = {
            host: validatedSmtpHost,
            port: smtpParams.port,
            ...(0, build_smtp_tls_options_util_1.buildSmtpTlsOptions)(smtpParams.connectionSecurity),
            auth: {
                user: smtpParams.username ?? connectedAccount.handle ?? '',
                pass: smtpParams.password,
            },
            tls: (0, build_mail_server_certificate_options_util_1.buildMailServerCertificateOptions)({
                host: smtpParams.host,
                isSelfSignedCertificateAllowed: this.kovaaLabConfigService.get('IMAP_SMTP_ALLOW_SELF_SIGNED'),
            }),
        };
        const transporter = (0, nodemailer_1.createTransport)(options);
        return transporter;
    }
};
exports.SmtpClientProvider = SmtpClientProvider;
exports.SmtpClientProvider = SmtpClientProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __metadata("design:paramtypes", [secure_http_client_service_1.SecureHttpClientService,
        kovaa_lab_config_service_1.KovaaLabCRMConfigService,
        connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService,
        typeorm_2.Repository])
], SmtpClientProvider);
