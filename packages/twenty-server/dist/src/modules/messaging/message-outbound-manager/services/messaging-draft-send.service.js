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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingDraftSendService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
const messaging_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service");
let MessagingDraftSendService = class MessagingDraftSendService {
    workspaceOrmManager;
    messageOutboundService;
    messageCleanerService;
    messageChannelRepository;
    constructor(workspaceOrmManager, messageOutboundService, messageCleanerService, messageChannelRepository) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageOutboundService = messageOutboundService;
        this.messageCleanerService = messageCleanerService;
        this.messageChannelRepository = messageChannelRepository;
    }
    async sendDraftMessage({ draftMessageId, sendMessageInput, connectedAccount, workspaceId, }) {
        const draftAssociation = await this.resolveDraftAssociation(draftMessageId, connectedAccount.id, workspaceId);
        if (!(0, utils_1.isDefined)(draftAssociation)) {
            throw new Error(`Could not find a synced draft to send for message ${draftMessageId}`);
        }
        return this.messageOutboundService.sendDraft(draftAssociation.messageExternalId, sendMessageInput, connectedAccount);
    }
    async getSentMessageThreadId({ messageExternalId, workspaceId, }) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
            const association = await messageChannelMessageAssociationRepository.findOne({
                where: { messageExternalId },
                relations: { message: true },
            });
            return association?.message?.messageThreadId ?? undefined;
        }, authContext, { lite: true });
    }
    async deleteSentDraft({ draftMessageId, connectedAccountId, workspaceId, }) {
        const draftAssociation = await this.resolveDraftAssociation(draftMessageId, connectedAccountId, workspaceId);
        if (!(0, utils_1.isDefined)(draftAssociation)) {
            return;
        }
        await this.messageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
            workspaceId,
            messageExternalIds: [draftAssociation.messageExternalId],
            messageChannelId: draftAssociation.messageChannelId,
        });
    }
    // Scoped to the caller's own channels so a member cannot act on another
    // member's draft by passing its message id.
    async resolveDraftAssociation(draftMessageId, connectedAccountId, workspaceId) {
        const channels = await this.messageChannelRepository.find({
            where: { connectedAccountId, workspaceId },
        });
        const channelIds = channels.map((channel) => channel.id);
        if (channelIds.length === 0) {
            return null;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        const associations = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
            return messageChannelMessageAssociationRepository.find({
                where: {
                    messageId: draftMessageId,
                    messageChannelId: (0, typeorm_2.In)(channelIds),
                },
            });
        }, authContext, { lite: true });
        const association = associations.find((currentAssociation) => (0, guards_1.isNonEmptyString)(currentAssociation.messageExternalId));
        if (!association || !(0, guards_1.isNonEmptyString)(association.messageExternalId)) {
            return null;
        }
        return {
            messageExternalId: association.messageExternalId,
            messageChannelId: association.messageChannelId,
        };
    }
};
exports.MessagingDraftSendService = MessagingDraftSendService;
exports.MessagingDraftSendService = MessagingDraftSendService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, messaging_message_outbound_service_1.MessagingMessageOutboundService,
        messaging_message_cleaner_service_1.MessagingMessageCleanerService,
        typeorm_2.Repository])
], MessagingDraftSendService);
