"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
let MessagingSendManagerModule = class MessagingSendManagerModule {
};
exports.MessagingSendManagerModule = MessagingSendManagerModule;
exports.MessagingSendManagerModule = MessagingSendManagerModule = __decorate([
    (0, common_1.Module)({
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
    })
], MessagingSendManagerModule);
