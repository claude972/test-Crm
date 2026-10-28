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
exports.MessagingMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
let MessagingMessageOutboundService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageOutboundService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageOutboundService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gmailMessageOutboundService;
        microsoftMessageOutboundService;
        imapSmtpMessageOutboundService;
        emailGroupMessageOutboundService;
        constructor(gmailMessageOutboundService, microsoftMessageOutboundService, imapSmtpMessageOutboundService, emailGroupMessageOutboundService) {
            this.gmailMessageOutboundService = gmailMessageOutboundService;
            this.microsoftMessageOutboundService = microsoftMessageOutboundService;
            this.imapSmtpMessageOutboundService = imapSmtpMessageOutboundService;
            this.emailGroupMessageOutboundService = emailGroupMessageOutboundService;
        }
        async sendMessage(sendMessageInput, connectedAccount) {
            switch (connectedAccount.provider) {
                case types_1.ConnectedAccountProvider.GOOGLE:
                    return this.gmailMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.MICROSOFT:
                    return this.microsoftMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                    return this.imapSmtpMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.EMAIL_GROUP:
                    return this.emailGroupMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.OIDC:
                case types_1.ConnectedAccountProvider.SAML:
                case types_1.ConnectedAccountProvider.APP:
                    throw new Error(`Provider ${connectedAccount.provider} does not support sending messages`);
                default:
                    (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for sending messages`);
            }
        }
        async createDraft(sendMessageInput, connectedAccount) {
            switch (connectedAccount.provider) {
                case types_1.ConnectedAccountProvider.GOOGLE:
                    return this.gmailMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.MICROSOFT:
                    return this.microsoftMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                    return this.imapSmtpMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.EMAIL_GROUP:
                case types_1.ConnectedAccountProvider.OIDC:
                case types_1.ConnectedAccountProvider.SAML:
                case types_1.ConnectedAccountProvider.APP:
                    throw new Error(`Provider ${connectedAccount.provider} does not support creating drafts`);
                default:
                    (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for creating drafts`);
            }
        }
        async sendDraft(draftExternalId, sendMessageInput, connectedAccount) {
            switch (connectedAccount.provider) {
                case types_1.ConnectedAccountProvider.GOOGLE:
                    return this.gmailMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.MICROSOFT:
                    return this.microsoftMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                    return this.imapSmtpMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
                case types_1.ConnectedAccountProvider.EMAIL_GROUP:
                case types_1.ConnectedAccountProvider.OIDC:
                case types_1.ConnectedAccountProvider.SAML:
                case types_1.ConnectedAccountProvider.APP:
                    throw new Error(`Provider ${connectedAccount.provider} does not support sending drafts`);
                default:
                    (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for sending drafts`);
            }
        }
    };
    return MessagingMessageOutboundService = _classThis;
})();
exports.MessagingMessageOutboundService = MessagingMessageOutboundService;
