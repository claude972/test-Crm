"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapClientProvider = void 0;
const common_1 = require("@nestjs/common");
const imapflow_1 = require("imapflow");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const build_imap_tls_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-imap-tls-options.util");
const build_mail_server_certificate_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-mail-server-certificate-options.util");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const parse_imap_authentication_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-imap-authentication-error.util");
let ImapClientProvider = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ImapClientProvider = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ImapClientProvider = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        secureHttpClientService;
        kovaaLabConfigService;
        connectedAccountTokenEncryptionService;
        connectedAccountRepository;
        logger = new common_1.Logger(ImapClientProvider.name);
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
                connectionTimeout: ImapClientProvider.CONNECTION_TIMEOUT_MS,
                greetingTimeout: ImapClientProvider.GREETING_TIMEOUT_MS,
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
        static {
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return ImapClientProvider = _classThis;
})();
exports.ImapClientProvider = ImapClientProvider;
