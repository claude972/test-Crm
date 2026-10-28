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
exports.SentMessagePersistenceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const messaging_save_messages_and_enqueue_contact_creation_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service");
const format_sent_message_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-sent-message.util");
let SentMessagePersistenceService = class SentMessagePersistenceService {
    messageChannelRepository;
    saveMessagesAndEnqueueContactCreationService;
    constructor(messageChannelRepository, saveMessagesAndEnqueueContactCreationService) {
        this.messageChannelRepository = messageChannelRepository;
        this.saveMessagesAndEnqueueContactCreationService = saveMessagesAndEnqueueContactCreationService;
    }
    async persistSentMessage(input) {
        const messageChannel = await this.messageChannelRepository.findOneOrFail({
            where: {
                id: input.messageChannelId,
                workspaceId: input.workspaceId,
            },
            relations: { connectedAccount: true },
        });
        const messageToSave = (0, format_sent_message_util_1.formatSentMessage)(input);
        const savedMessagesResult = await this.saveMessagesAndEnqueueContactCreationService.saveMessagesAndEnqueueContactCreation({
            messagesToSave: [messageToSave],
            messageChannel,
            connectedAccount: messageChannel.connectedAccount,
            workspaceId: input.workspaceId,
        });
        const messageId = savedMessagesResult?.messageExternalIdsAndIdsMap.get(messageToSave.externalId);
        const messageThreadId = savedMessagesResult?.messageExternalIdToMessageThreadIdMap.get(messageToSave.externalId);
        if (!(0, utils_1.isDefined)(messageId) || !(0, utils_1.isDefined)(messageThreadId)) {
            return undefined;
        }
        return { messageId, messageThreadId };
    }
};
exports.SentMessagePersistenceService = SentMessagePersistenceService;
exports.SentMessagePersistenceService = SentMessagePersistenceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        messaging_save_messages_and_enqueue_contact_creation_service_1.MessagingSaveMessagesAndEnqueueContactCreationService])
], SentMessagePersistenceService);
