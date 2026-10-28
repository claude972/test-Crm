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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MessagingDeleteGroupEmailMessagesService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingDeleteGroupEmailMessagesService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
const is_group_email_1 = require("src/modules/messaging/message-import-manager/utils/is-group-email");
const MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE = 500;
const MESSAGE_EXTERNAL_ID_DELETION_CHUNK_SIZE = 200;
let MessagingDeleteGroupEmailMessagesService = MessagingDeleteGroupEmailMessagesService_1 = class MessagingDeleteGroupEmailMessagesService {
    workspaceOrmManager;
    messagingMessageCleanerService;
    logger = new common_1.Logger(MessagingDeleteGroupEmailMessagesService_1.name);
    constructor(workspaceOrmManager, messagingMessageCleanerService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messagingMessageCleanerService = messagingMessageCleanerService;
    }
    async deleteGroupEmailMessages(workspaceId, messageChannelId) {
        this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Deleting messages from group email addresses`);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
            const messageParticipantRepository = this.workspaceOrmManager.getRepository('messageParticipant', { shouldBypassPermissionChecks: true });
            let cursorId;
            let totalDeletedCount = 0;
            for (;;) {
                const associations = await messageChannelMessageAssociationRepository.find({
                    where: {
                        messageChannelId,
                        ...((0, utils_1.isDefined)(cursorId) ? { id: (0, typeorm_1.MoreThan)(cursorId) } : {}),
                    },
                    order: { id: 'ASC' },
                    take: MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE,
                });
                if (associations.length === 0) {
                    break;
                }
                const messageIds = [
                    ...new Set(associations
                        .map((association) => association.messageId)
                        .filter(guards_1.isNonEmptyString)),
                ];
                const senders = await messageParticipantRepository.find({
                    where: {
                        messageId: (0, typeorm_1.In)(messageIds),
                        role: types_1.MessageParticipantRole.FROM,
                    },
                });
                const groupEmailMessageIds = new Set(senders
                    .filter((sender) => (0, guards_1.isNonEmptyString)(sender.handle) &&
                    (0, is_group_email_1.isGroupEmail)(sender.handle))
                    .map((sender) => sender.messageId));
                const messageExternalIdsToDelete = associations
                    .filter((association) => groupEmailMessageIds.has(association.messageId))
                    .map((association) => association.messageExternalId)
                    .filter(guards_1.isNonEmptyString);
                for (const messageExternalIdsChunk of (0, lodash_chunk_1.default)(messageExternalIdsToDelete, MESSAGE_EXTERNAL_ID_DELETION_CHUNK_SIZE)) {
                    await this.messagingMessageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
                        workspaceId,
                        messageExternalIds: messageExternalIdsChunk,
                        messageChannelId,
                    });
                    totalDeletedCount += messageExternalIdsChunk.length;
                }
                if (associations.length < MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE) {
                    break;
                }
                cursorId = associations[associations.length - 1].id;
            }
            this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed deleting ${totalDeletedCount} group email messages`);
            return totalDeletedCount;
        }, authContext, { lite: true });
    }
};
exports.MessagingDeleteGroupEmailMessagesService = MessagingDeleteGroupEmailMessagesService;
exports.MessagingDeleteGroupEmailMessagesService = MessagingDeleteGroupEmailMessagesService = MessagingDeleteGroupEmailMessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, messaging_message_cleaner_service_1.MessagingMessageCleanerService])
], MessagingDeleteGroupEmailMessagesService);
