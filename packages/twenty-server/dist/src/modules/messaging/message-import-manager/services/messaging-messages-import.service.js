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
var MessagingMessagesImportService_1;
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessagesImportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const utils_1 = require("src/shared/utils");
const typeorm_2 = require("typeorm");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const blocklist_repository_1 = require("src/modules/blocklist/repositories/blocklist.repository");
const email_alias_manager_service_1 = require("src/modules/connected-account/email-alias-manager/services/email-alias-manager.service");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const messaging_get_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-get-messages.service");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const messaging_save_messages_and_enqueue_contact_creation_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service");
const filter_emails_util_1 = require("src/modules/messaging/message-import-manager/utils/filter-emails.util");
const messaging_monitoring_service_1 = require("src/modules/messaging/monitoring/services/messaging-monitoring.service");
const types_1 = require("src/shared/types");
let MessagingMessagesImportService = MessagingMessagesImportService_1 = class MessagingMessagesImportService {
    cacheStorage;
    messageChannelSyncStatusService;
    saveMessagesAndEnqueueContactCreationService;
    messagingMonitoringService;
    blocklistRepository;
    emailAliasManagerService;
    workspaceOrmManager;
    messageChannelRepository;
    messagingGetMessagesService;
    messageImportErrorHandlerService;
    userWorkspaceRepository;
    workspaceRepository;
    kovaaLabConfigService;
    logger = new common_1.Logger(MessagingMessagesImportService_1.name);
    constructor(cacheStorage, messageChannelSyncStatusService, saveMessagesAndEnqueueContactCreationService, messagingMonitoringService, blocklistRepository, emailAliasManagerService, workspaceOrmManager, messageChannelRepository, messagingGetMessagesService, messageImportErrorHandlerService, userWorkspaceRepository, workspaceRepository, kovaaLabConfigService) {
        this.cacheStorage = cacheStorage;
        this.messageChannelSyncStatusService = messageChannelSyncStatusService;
        this.saveMessagesAndEnqueueContactCreationService = saveMessagesAndEnqueueContactCreationService;
        this.messagingMonitoringService = messagingMonitoringService;
        this.blocklistRepository = blocklistRepository;
        this.emailAliasManagerService = emailAliasManagerService;
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messagingGetMessagesService = messagingGetMessagesService;
        this.messageImportErrorHandlerService = messageImportErrorHandlerService;
        this.userWorkspaceRepository = userWorkspaceRepository;
        this.workspaceRepository = workspaceRepository;
        this.kovaaLabConfigService = kovaaLabConfigService;
    }
    async processMessageBatchImport(messageChannel, connectedAccount, workspaceId, batchSize) {
        let messageIdsToFetch = [];
        const messagesGetBatchSize = batchSize ??
            this.kovaaLabConfigService.get('MESSAGING_MESSAGES_GET_BATCH_SIZE');
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            try {
                if (messageChannel.syncStage !==
                    types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED) {
                    return;
                }
                await this.messagingMonitoringService.track({
                    eventName: 'messages_import.started',
                    workspaceId,
                    connectedAccountId: messageChannel.connectedAccountId,
                    messageChannelId: messageChannel.id,
                });
                await this.messageChannelSyncStatusService.markAsMessagesImportOngoing([messageChannel.id], workspaceId);
                if (!(0, utils_1.isDefined)(connectedAccount.handleAliases)) {
                    connectedAccount.handleAliases =
                        await this.emailAliasManagerService.refreshHandleAliases(connectedAccount, workspaceId);
                }
                messageIdsToFetch = await this.cacheStorage.setPop(`messages-to-import:${workspaceId}:${messageChannel.id}`, messagesGetBatchSize);
                if (!messageIdsToFetch?.length) {
                    await this.messageChannelSyncStatusService.markAsMessageSyncCompleted([messageChannel.id], workspaceId);
                    return await this.trackMessageImportCompleted(messageChannel, workspaceId);
                }
                const allMessages = await this.messagingGetMessagesService.getMessages(messageIdsToFetch, connectedAccount, messageChannel);
                const messageFolders = messageChannel.messageFolders ?? [];
                const foldersWithExternalId = messageFolders.filter((folder) => (0, utils_1.isDefined)(folder.externalId));
                const folderExternalToInternalMap = new Map(foldersWithExternalId.map((folder) => [
                    folder.externalId,
                    folder.id,
                ]));
                for (const message of allMessages) {
                    const externalFolderIds = message.messageFolderExternalIds ?? [];
                    message.messageFolderIds = externalFolderIds
                        .map((externalId) => folderExternalToInternalMap.get(externalId))
                        .filter(utils_1.isDefined);
                }
                const userWorkspace = await this.userWorkspaceRepository.findOne({
                    where: {
                        id: connectedAccount.userWorkspaceId,
                    },
                });
                const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
                const workspaceMember = userWorkspace
                    ? await workspaceMemberRepository.findOne({
                        where: { userId: userWorkspace.userId },
                    })
                    : null;
                const blocklist = await this.blocklistRepository.getEntriesApplicableToWorkspaceMember({
                    workspaceMemberId: workspaceMember?.id ?? null,
                    workspaceId,
                });
                if (!(0, utils_1.isDefined)(messageChannel.handle)) {
                    throw new message_import_driver_exception_1.MessageImportDriverException('Message channel handle is required', message_import_driver_exception_1.MessageImportDriverExceptionCode.CHANNEL_MISCONFIGURED);
                }
                if (!(0, utils_1.isDefined)(connectedAccount.handleAliases)) {
                    throw new message_import_driver_exception_1.MessageImportDriverException('Message channel handle is required', message_import_driver_exception_1.MessageImportDriverExceptionCode.CHANNEL_MISCONFIGURED);
                }
                const workspace = await this.workspaceRepository.findOne({
                    where: { id: workspaceId },
                    select: ['id', 'isInternalMessagesImportEnabled'],
                });
                const messagesToSave = (0, filter_emails_util_1.filterEmails)(messageChannel.handle, [...connectedAccount.handleAliases], allMessages, blocklist
                    .map((blocklistItem) => blocklistItem.handle)
                    .filter(utils_1.isDefined), messageChannel.excludeGroupEmails, workspace?.isInternalMessagesImportEnabled ?? false);
                if (messagesToSave.length > 0) {
                    await this.saveMessagesAndEnqueueContactCreationService.saveMessagesAndEnqueueContactCreation({
                        messagesToSave,
                        messageChannel,
                        connectedAccount,
                        workspaceId,
                    });
                }
                const isLastBatch = messageIdsToFetch.length < messagesGetBatchSize;
                if (isLastBatch) {
                    await this.messageChannelSyncStatusService.markAsMessageSyncCompleted([messageChannel.id], workspaceId);
                }
                else {
                    await this.messageChannelSyncStatusService.markAsMessagesImportPending([messageChannel.id], workspaceId);
                }
                await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                    throttleFailureCount: 0,
                    throttleRetryAfter: null,
                    syncStageStartedAt: null,
                });
                if (!isLastBatch) {
                    await this.cacheStorage.incrBy(`messages-imported:${workspaceId}:${messageChannel.id}`, messageIdsToFetch.length);
                }
                return await this.trackMessageImportCompleted(messageChannel, workspaceId);
            }
            catch (error) {
                this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Error (${error.code}) importing messages: ${error.message}`);
                await this.cacheStorage.setAdd(`messages-to-import:${workspaceId}:${messageChannel.id}`, messageIdsToFetch);
                await this.messageImportErrorHandlerService.handleDriverException(error, messaging_import_exception_handler_service_1.MessageImportSyncStep.MESSAGES_IMPORT_ONGOING, messageChannel, workspaceId);
                return await this.trackMessageImportCompleted(messageChannel, workspaceId);
            }
        }, authContext, { lite: true });
    }
    async trackMessageImportCompleted(messageChannel, workspaceId) {
        await this.messagingMonitoringService.track({
            eventName: 'messages_import.completed',
            workspaceId,
            connectedAccountId: messageChannel.connectedAccountId,
            messageChannelId: messageChannel.id,
        });
    }
};
exports.MessagingMessagesImportService = MessagingMessagesImportService;
exports.MessagingMessagesImportService = MessagingMessagesImportService = MessagingMessagesImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleMessaging)),
    __param(7, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(10, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __param(11, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _a : Object, message_channel_sync_status_service_1.MessageChannelSyncStatusService,
        messaging_save_messages_and_enqueue_contact_creation_service_1.MessagingSaveMessagesAndEnqueueContactCreationService, typeof (_b = typeof messaging_monitoring_service_1.MessagingMonitoringService !== "undefined" && messaging_monitoring_service_1.MessagingMonitoringService) === "function" ? _b : Object, typeof (_c = typeof blocklist_repository_1.BlocklistRepository !== "undefined" && blocklist_repository_1.BlocklistRepository) === "function" ? _c : Object, typeof (_d = typeof email_alias_manager_service_1.EmailAliasManagerService !== "undefined" && email_alias_manager_service_1.EmailAliasManagerService) === "function" ? _d : Object, typeof (_e = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _e : Object, typeorm_2.Repository,
        messaging_get_messages_service_1.MessagingGetMessagesService,
        messaging_import_exception_handler_service_1.MessageImportExceptionHandlerService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        kovaa_lab_config_service_1.KovaaLabCRMConfigService])
], MessagingMessagesImportService);
