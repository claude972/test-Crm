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
exports.MessagingSendManagerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const billing_module_1 = require("src/engine/core-modules/billing/billing.module");
const emailing_domain_entity_1 = require("src/engine/core-modules/emailing-domain/emailing-domain.entity");
const usage_limit_module_1 = require("src/engine/core-modules/usage-limit/usage-limit.module");
const emailing_module_1 = require("src/modules/emailing/emailing.module");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
const oauth2_client_manager_module_1 = require("src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module");
const messaging_imap_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/imap/messaging-imap-driver.module");
const messaging_smtp_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/smtp/messaging-smtp-driver.module");
const messaging_import_manager_module_1 = require("src/modules/messaging/message-import-manager/messaging-import-manager.module");
const messaging_message_cleaner_module_1 = require("src/modules/messaging/message-cleaner/messaging-message-cleaner.module");
const email_group_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/email-group/services/email-group-message-outbound.service");
const gmail_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/gmail/services/gmail-message-outbound.service");
const imap_smtp_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/imap/services/imap-smtp-message-outbound.service");
const microsoft_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/microsoft/services/microsoft-message-outbound.service");
const messaging_draft_send_service_1 = require("src/modules/messaging/message-outbound-manager/services/messaging-draft-send.service");
const messaging_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service");
const send_email_service_1 = require("src/modules/messaging/message-outbound-manager/services/send-email.service");
const sent_message_persistence_service_1 = require("src/modules/messaging/message-outbound-manager/services/sent-message-persistence.service");
let MessagingSendManagerModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                oauth2_client_manager_module_1.OAuth2ClientManagerModule,
                messaging_imap_driver_module_1.MessagingIMAPDriverModule,
                messaging_smtp_driver_module_1.MessagingSmtpDriverModule,
                messaging_import_manager_module_1.MessagingImportManagerModule,
                messaging_message_cleaner_module_1.MessagingMessageCleanerModule,
                emailing_module_1.EmailingModule,
                billing_module_1.BillingModule,
                usage_limit_module_1.UsageLimitModule,
                typeorm_1.TypeOrmModule.forFeature([
                    message_channel_entity_1.MessageChannelEntity,
                    message_folder_entity_1.MessageFolderEntity,
                    emailing_domain_entity_1.EmailingDomainEntity,
                ]),
            ],
            providers: [
                gmail_message_outbound_service_1.GmailMessageOutboundService,
                microsoft_message_outbound_service_1.MicrosoftMessageOutboundService,
                imap_smtp_message_outbound_service_1.ImapSmtpMessageOutboundService,
                email_group_message_outbound_service_1.EmailGroupMessageOutboundService,
                messaging_message_outbound_service_1.MessagingMessageOutboundService,
                messaging_draft_send_service_1.MessagingDraftSendService,
                send_email_service_1.SendEmailService,
                sent_message_persistence_service_1.SentMessagePersistenceService,
                (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(emailing_domain_entity_1.EmailingDomainEntity),
                (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity),
            ],
            exports: [messaging_message_outbound_service_1.MessagingMessageOutboundService, send_email_service_1.SendEmailService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingSendManagerModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingSendManagerModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return MessagingSendManagerModule = _classThis;
})();
exports.MessagingSendManagerModule = MessagingSendManagerModule;
