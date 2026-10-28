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
var ImapClientProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapClientProvider = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const imapflow_1 = require("imapflow");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const typeorm_2 = require("typeorm");
const build_imap_tls_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-imap-tls-options.util");
const build_mail_server_certificate_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-mail-server-certificate-options.util");
const secure_http_client_service_1 = require("src/engine/core-modules/secure-http-client/secure-http-client.service");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const connected_account_token_encryption_service_1 = require("src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const parse_imap_authentication_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-imap-authentication-error.util");
let ImapClientProvider = class ImapClientProvider {
    static { ImapClientProvider_1 = this; }
    secureHttpClientService;
    kovaaLabConfigService;
    connectedAccountTokenEncryptionService;
    connectedAccountRepository;
    logger = new common_1.Logger(ImapClientProvider_1.name);
    static CONNECTION_TIMEOUT_MS = 30000;
    static GREETING_TIMEOUT_MS = 16000;
    constructor(secureHttpClientService, kovaaLabConfigService, connectedAccountTokenEncryptionService, connectedAccountRepository) {
        this.secureHttpClientService = secureHttpClientService;
        this.kovaaLabConfigService = kovaaLabConfigService;
        this.connectedAccountTokenEncryptionService = connectedAccountTokenEncryptionService;
        this.connectedAccountRepository = connectedAccountRepository;
    }
    async getClient(connectedAccountId) {
        const connectedAccount = await this.loadConnectedAccount(connectedAccountId);
        try {
            return await this.createConnection(connectedAccount);
        }
        catch (error) {
            this.logger.error(`Failed to establish IMAP connection for ${connectedAccount.handle}: ${error.message}`, error.stack);
            throw (0, parse_imap_authentication_error_util_1.parseImapAuthenticationError)(error);
        }
    }
    async closeClient(client) {
        try {
            await client.logout();
            this.logger.log('Closed IMAP client');
        }
        catch (error) {
            this.logger.error(`Error closing IMAP client: ${error.message}`);
        }
    }
    async loadConnectedAccount(connectedAccountId) {
        const connectedAccount = await this.connectedAccountRepository.findOne({
            where: { id: connectedAccountId },
        });
        if (!(0, utils_1.isDefined)(connectedAccount) ||
            connectedAccount.provider !== types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV ||
            !(0, utils_1.isDefined)(connectedAccount.connectionParameters?.IMAP)) {
            throw new message_import_driver_exception_1.MessageImportDriverException(`Missing IMAP credentials for connected account ${connectedAccountId}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS);
        }
        return connectedAccount;
    }
    async createConnection(connectedAccount) {
        if (!(0, utils_1.isDefined)(connectedAccount.connectionParameters?.IMAP)) {
            throw new Error('Connected account is not an IMAP provider');
        }
        const imapParams = this.connectedAccountTokenEncryptionService.decryptProtocolPassword({
            protocolParams: connectedAccount.connectionParameters.IMAP,
            workspaceId: connectedAccount.workspaceId,
        });
        const validatedImapHost = await this.secureHttpClientService.getValidatedHost(imapParams.host);
        const client = new imapflow_1.ImapFlow({
            host: validatedImapHost,
            port: imapParams.port || 993,
            ...(0, build_imap_tls_options_util_1.buildImapTlsOptions)(imapParams.connectionSecurity),
            auth: {
                user: (0, utils_1.isDefined)(imapParams.username)
                    ? imapParams.username
                    : connectedAccount.handle,
                pass: imapParams.password,
            },
            logger: false,
            disableIMAP4rev2: true,
            tls: (0, build_mail_server_certificate_options_util_1.buildMailServerCertificateOptions)({
                host: imapParams.host,
                isSelfSignedCertificateAllowed: this.kovaaLabConfigService.get('IMAP_SMTP_ALLOW_SELF_SIGNED'),
            }),
            connectionTimeout: ImapClientProvider_1.CONNECTION_TIMEOUT_MS,
            greetingTimeout: ImapClientProvider_1.GREETING_TIMEOUT_MS,
        });
        // ImapFlow is long-lived EventEmitter — missing 'error' listener crashes process on socket timeout.
        client.on('error', (error) => {
            this.logger.error(`IMAP client error for ${connectedAccount.handle}: ${error.message}`, error.stack);
        });
        try {
            await client.connect();
            this.logger.log(`Connected to IMAP server for ${connectedAccount.handle}`);
            return client;
        }
        catch (error) {
            try {
                await client.logout();
            }
            catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }
};
exports.ImapClientProvider = ImapClientProvider;
exports.ImapClientProvider = ImapClientProvider = ImapClientProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __metadata("design:paramtypes", [secure_http_client_service_1.SecureHttpClientService,
        kovaa_lab_config_service_1.KovaaLabCRMConfigService,
        connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService,
        typeorm_2.Repository])
], ImapClientProvider);
