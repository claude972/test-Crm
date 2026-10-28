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
exports.SmtpClientProvider = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = require("nodemailer");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const build_mail_server_certificate_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-mail-server-certificate-options.util");
const build_smtp_tls_options_util_1 = require("src/engine/core-modules/imap-smtp-caldav-connection/utils/build-smtp-tls-options.util");
let SmtpClientProvider = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SmtpClientProvider = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SmtpClientProvider = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return SmtpClientProvider = _classThis;
})();
exports.SmtpClientProvider = SmtpClientProvider;
