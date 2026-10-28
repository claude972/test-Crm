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
exports.MessageChannelSyncStatusService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const metrics_keys_type_1 = require("src/engine/core-modules/metrics/types/metrics-keys.type");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const accounts_to_reconnect_key_value_type_1 = require("src/modules/connected-account/types/accounts-to-reconnect-key-value.type");
const compute_message_import_progress_util_1 = require("src/engine/metadata-modules/message-channel/utils/compute-message-import-progress.util");
let MessageChannelSyncStatusService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessageChannelSyncStatusService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessageChannelSyncStatusService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cacheStorage;
        workspaceOrmManager;
        messageChannelRepository;
        messageFolderRepository;
        connectedAccountRepository;
        userWorkspaceRepository;
        accountsToReconnectService;
        metricsService;
        workspaceEventBroadcaster;
        logger = new common_1.Logger(MessageChannelSyncStatusService.name);
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
                await this.messageChannelRepository.update({ id: (0, typeorm_1.In)(messageChannelIds), workspaceId }, {
                    syncCursor: '',
                    syncStageStartedAt: null,
                    throttleFailureCount: 0,
                    throttleRetryAfter: null,
                    pendingGroupEmailsAction: types_1.MessageChannelPendingGroupEmailsAction.NONE,
                });
                await this.messageFolderRepository.update(workspaceId, { messageChannelId: (0, typeorm_1.In)(messageChannelIds) }, {
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
                await this.messageChannelRepository.update({ id: (0, typeorm_1.In)(messageChannelIds), workspaceId }, { syncStageStartedAt: null });
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
                id: (0, typeorm_1.In)(messageChannelIds),
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
                        where: { id: (0, typeorm_1.In)(messageChannelIds), workspaceId },
                    });
                    const connectedAccountIds = messageChannels.map((messageChannel) => messageChannel.connectedAccountId);
                    await this.connectedAccountRepository.update({ id: (0, typeorm_1.Any)(connectedAccountIds), workspaceId }, {
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
                    .where({ id: (0, typeorm_1.In)(messageChannelIds), workspaceId })
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
                where: { id: (0, typeorm_1.In)(messageChannelIds), workspaceId },
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
    return MessageChannelSyncStatusService = _classThis;
})();
exports.MessageChannelSyncStatusService = MessageChannelSyncStatusService;
