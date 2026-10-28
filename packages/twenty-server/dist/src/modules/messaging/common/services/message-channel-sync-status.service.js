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
var MessageChannelSyncStatusService_1;
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageChannelSyncStatusService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const metrics_service_1 = require("src/engine/core-modules/metrics/metrics.service");
const metrics_keys_type_1 = require("src/engine/core-modules/metrics/types/metrics-keys.type");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const accounts_to_reconnect_service_1 = require("src/modules/connected-account/services/accounts-to-reconnect.service");
const accounts_to_reconnect_key_value_type_1 = require("src/modules/connected-account/types/accounts-to-reconnect-key-value.type");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const workspace_event_broadcaster_service_1 = require("src/engine/subscriptions/workspace-event-broadcaster/workspace-event-broadcaster.service");
const compute_message_import_progress_util_1 = require("src/engine/metadata-modules/message-channel/utils/compute-message-import-progress.util");
let MessageChannelSyncStatusService = MessageChannelSyncStatusService_1 = class MessageChannelSyncStatusService {
    cacheStorage;
    workspaceOrmManager;
    messageChannelRepository;
    messageFolderRepository;
    connectedAccountRepository;
    userWorkspaceRepository;
    accountsToReconnectService;
    metricsService;
    workspaceEventBroadcaster;
    logger = new common_1.Logger(MessageChannelSyncStatusService_1.name);
    constructor(cacheStorage, workspaceOrmManager, messageChannelRepository, messageFolderRepository, connectedAccountRepository, userWorkspaceRepository, accountsToReconnectService, metricsService, workspaceEventBroadcaster) {
        this.cacheStorage = cacheStorage;
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageFolderRepository = messageFolderRepository;
        this.connectedAccountRepository = connectedAccountRepository;
        this.userWorkspaceRepository = userWorkspaceRepository;
        this.accountsToReconnectService = accountsToReconnectService;
        this.metricsService = metricsService;
        this.workspaceEventBroadcaster = workspaceEventBroadcaster;
    }
    async markAsMessagesListFetchPending(messageChannelIds, workspaceId, preserveSyncStageStartedAt = false) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
            ...(!preserveSyncStageStartedAt ? { syncStageStartedAt: null } : {}),
        });
    }
    async markAsMessagesImportPending(messageChannelIds, workspaceId, preserveSyncStageStartedAt = false) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_PENDING,
            ...(!preserveSyncStageStartedAt ? { syncStageStartedAt: null } : {}),
        });
    }
    async resetAndMarkAsMessagesListFetchPending(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        for (const messageChannelId of messageChannelIds) {
            await this.cacheStorage.mdel([
                `messages-to-import:${workspaceId}:${messageChannelId}`,
                `messages-to-import-total:${workspaceId}:${messageChannelId}`,
                `messages-imported:${workspaceId}:${messageChannelId}`,
            ]);
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.messageChannelRepository.update({ id: (0, typeorm_2.In)(messageChannelIds), workspaceId }, {
                syncCursor: '',
                syncStageStartedAt: null,
                throttleFailureCount: 0,
                throttleRetryAfter: null,
                pendingGroupEmailsAction: types_1.MessageChannelPendingGroupEmailsAction.NONE,
            });
            await this.messageFolderRepository.update(workspaceId, { messageChannelId: (0, typeorm_2.In)(messageChannelIds) }, {
                syncCursor: '',
                pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
            });
        }, authContext, { lite: true });
        await this.markAsMessagesListFetchPending(messageChannelIds, workspaceId);
    }
    async resetSyncStageStartedAt(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.messageChannelRepository.update({ id: (0, typeorm_2.In)(messageChannelIds), workspaceId }, { syncStageStartedAt: null });
        }, authContext, { lite: true });
    }
    async markAsMessagesListFetchScheduled(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED,
            syncStatus: types_1.MessageChannelSyncStatus.ONGOING,
            syncStageStartedAt: new Date().toISOString(),
        });
    }
    async markAsMessagesListFetchScheduledIfPending(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return [];
        }
        const updateResult = await this.messageChannelRepository
            .createQueryBuilder()
            .update()
            .set({
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED,
            syncStageStartedAt: new Date(),
        })
            .where({
            id: (0, typeorm_2.In)(messageChannelIds),
            workspaceId,
            isSyncEnabled: true,
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
        })
            .returning('id')
            .execute();
        return updateResult.raw.map((row) => row.id);
    }
    async markAsMessagesListFetchOngoing(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_ONGOING,
            syncStatus: types_1.MessageChannelSyncStatus.ONGOING,
            syncStageStartedAt: new Date().toISOString(),
        });
    }
    async markAsMessageSyncCompleted(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.clearImportProgress(messageChannelIds, workspaceId);
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStatus: types_1.MessageChannelSyncStatus.ACTIVE,
            syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
            throttleFailureCount: 0,
            throttleRetryAfter: null,
            syncStageStartedAt: null,
            syncedAt: new Date().toISOString(),
        });
        await this.metricsService.incrementCounterForEvents({
            key: metrics_keys_type_1.MetricsKeys.MessageChannelSyncJobActive,
            eventIds: messageChannelIds,
        });
    }
    async markAsMessagesImportScheduled(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED,
        });
    }
    async markAsMessagesImportOngoing(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_ONGOING,
            syncStatus: types_1.MessageChannelSyncStatus.ONGOING,
            syncStageStartedAt: new Date().toISOString(),
        });
    }
    async markAsFailed({ messageChannelIds, workspaceId, syncStatus, authFailedReason = null, }) {
        if (!messageChannelIds.length) {
            return;
        }
        this.logger.warn(`Marking message channels [${messageChannelIds.join(', ')}] as ${syncStatus} in workspace ${workspaceId}`);
        await this.clearImportProgress(messageChannelIds, workspaceId);
        await this.updateMessageChannels(messageChannelIds, workspaceId, {
            syncStage: types_1.MessageChannelSyncStage.FAILED,
            syncStatus: syncStatus,
            throttleRetryAfter: null,
        });
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const metricsKey = syncStatus ===
                types_1.MessageChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS
                ? metrics_keys_type_1.MetricsKeys.MessageChannelSyncJobFailedInsufficientPermissions
                : metrics_keys_type_1.MetricsKeys.MessageChannelSyncJobFailedUnknown;
            await this.metricsService.incrementCounterForEvents({
                key: metricsKey,
                eventIds: messageChannelIds,
            });
            if (syncStatus ===
                types_1.MessageChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS) {
                const messageChannels = await this.messageChannelRepository.find({
                    where: { id: (0, typeorm_2.In)(messageChannelIds), workspaceId },
                });
                const connectedAccountIds = messageChannels.map((messageChannel) => messageChannel.connectedAccountId);
                await this.connectedAccountRepository.update({ id: (0, typeorm_2.Any)(connectedAccountIds), workspaceId }, {
                    authFailedAt: new Date(),
                    authFailedReason,
                });
                await this.addToAccountsToReconnect(messageChannels.map((messageChannel) => messageChannel.id), workspaceId);
            }
        }, authContext, { lite: true });
    }
    async getImportProgress({ messageChannelId, workspaceId, }) {
        const [totalMessagesToImportCount, importedMessagesCount] = await this.cacheStorage.mget([
            `messages-to-import-total:${workspaceId}:${messageChannelId}`,
            `messages-imported:${workspaceId}:${messageChannelId}`,
        ]);
        return (0, compute_message_import_progress_util_1.computeMessageImportProgress)({
            importedMessagesCount,
            totalMessagesToImportCount,
        });
    }
    async clearImportProgress(messageChannelIds, workspaceId) {
        await this.cacheStorage.mdel(messageChannelIds.flatMap((messageChannelId) => [
            `messages-to-import-total:${workspaceId}:${messageChannelId}`,
            `messages-imported:${workspaceId}:${messageChannelId}`,
        ]));
    }
    async updateMessageChannels(messageChannelIds, workspaceId, values) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        const updatedMessageChannels = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const updateResult = await this.messageChannelRepository
                .createQueryBuilder()
                .update()
                .set(values)
                .where({ id: (0, typeorm_2.In)(messageChannelIds), workspaceId })
                .returning(`id, "syncStatus", "syncStage", (SELECT "userWorkspaceId" FROM core."connectedAccount" WHERE core."connectedAccount".id = "messageChannel"."connectedAccountId") AS "userWorkspaceId"`)
                .execute();
            return updateResult.raw;
        }, authContext, { lite: true });
        await this.broadcastMessageChannelsUpdated(updatedMessageChannels, workspaceId);
    }
    async broadcastMessageChannelsUpdated(updatedMessageChannels, workspaceId) {
        try {
            const events = await Promise.all(updatedMessageChannels.map(async ({ id, syncStatus, syncStage, userWorkspaceId }) => ({
                type: 'updated',
                entityName: 'messageChannel',
                recordId: id,
                properties: {
                    after: {
                        id,
                        syncStatus,
                        syncStage,
                        importProgress: await this.getImportProgress({
                            messageChannelId: id,
                            workspaceId,
                        }),
                    },
                },
                recipientUserWorkspaceIds: [userWorkspaceId],
            })));
            await this.workspaceEventBroadcaster.broadcast({ workspaceId, events });
        }
        catch (error) {
            this.logger.warn(`Failed to broadcast updated event for message channels [${updatedMessageChannels.map(({ id }) => id).join(', ')}] in workspace ${workspaceId}`, error);
        }
    }
    async addToAccountsToReconnect(messageChannelIds, workspaceId) {
        if (!messageChannelIds.length) {
            return;
        }
        const messageChannels = await this.messageChannelRepository.find({
            where: { id: (0, typeorm_2.In)(messageChannelIds), workspaceId },
        });
        const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
        for (const messageChannel of messageChannels) {
            const connectedAccount = await this.connectedAccountRepository.findOne({
                where: { id: messageChannel.connectedAccountId, workspaceId },
            });
            if (!connectedAccount) {
                continue;
            }
            const userWorkspace = await this.userWorkspaceRepository.findOne({
                where: { id: connectedAccount.userWorkspaceId },
            });
            if (!userWorkspace) {
                continue;
            }
            const workspaceMember = await workspaceMemberRepository.findOne({
                where: { userId: userWorkspace.userId },
            });
            if (!workspaceMember) {
                continue;
            }
            await this.accountsToReconnectService.addAccountToReconnectByKey(accounts_to_reconnect_key_value_type_1.AccountsToReconnectKeys.ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS, workspaceMember.userId, workspaceId, connectedAccount.id);
        }
    }
};
exports.MessageChannelSyncStatusService = MessageChannelSyncStatusService;
exports.MessageChannelSyncStatusService = MessageChannelSyncStatusService = MessageChannelSyncStatusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleMessaging)),
    __param(2, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(3, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeorm_2.Repository, typeof (_c = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _c : Object, typeorm_2.Repository,
        typeorm_2.Repository, typeof (_d = typeof accounts_to_reconnect_service_1.AccountsToReconnectService !== "undefined" && accounts_to_reconnect_service_1.AccountsToReconnectService) === "function" ? _d : Object, typeof (_e = typeof metrics_service_1.MetricsService !== "undefined" && metrics_service_1.MetricsService) === "function" ? _e : Object, typeof (_f = typeof workspace_event_broadcaster_service_1.WorkspaceEventBroadcaster !== "undefined" && workspace_event_broadcaster_service_1.WorkspaceEventBroadcaster) === "function" ? _f : Object])
], MessageChannelSyncStatusService);
