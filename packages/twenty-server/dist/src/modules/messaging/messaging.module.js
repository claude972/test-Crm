"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const messaging_blocklist_manager_module_1 = require("src/modules/messaging/blocklist-manager/messaging-blocklist-manager.module");
const messaging_message_cleaner_module_1 = require("src/modules/messaging/message-cleaner/messaging-message-cleaner.module");
const messaging_import_manager_module_1 = require("src/modules/messaging/message-import-manager/messaging-import-manager.module");
const message_participant_manager_module_1 = require("src/modules/messaging/message-participant-manager/message-participant-manager.module");
const messaging_monitoring_module_1 = require("src/modules/messaging/monitoring/messaging-monitoring.module");
const conversation_channel_entity_1 = require("src/modules/messaging/common/standard-objects/conversation-channel.entity");
const conversation_service_1 = require("src/modules/messaging/conversation.service");
const conversation_resolver_1 = require("src/modules/messaging/conversation.resolver");
const whatsapp_webhook_1 = require("src/modules/messaging/whatsapp-webhook");
const webchat_webhook_1 = require("src/modules/messaging/webchat-webhook");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            messaging_import_manager_module_1.MessagingImportManagerModule,
            messaging_message_cleaner_module_1.MessagingMessageCleanerModule,
            message_participant_manager_module_1.MessageParticipantManagerModule,
            messaging_blocklist_manager_module_1.MessagingBlocklistManagerModule,
            messaging_monitoring_module_1.MessagingMonitoringModule,
            typeorm_1.TypeOrmModule.forFeature([conversation_channel_entity_1.ConversationChannelEntity]),
        ],
        providers: [
            conversation_service_1.ConversationService,
            conversation_resolver_1.ConversationResolver,
            whatsapp_webhook_1.WhatsAppWebhookDriver,
            webchat_webhook_1.WebchatWebhookDriver,
        ],
        controllers: [
            whatsapp_webhook_1.WhatsAppWebhookController,
            webchat_webhook_1.WebchatWebhookController,
        ],
    })
], MessagingModule);
