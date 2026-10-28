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
var CalendarChannelSyncStatusService_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarChannelSyncStatusService = void 0;
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
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const accounts_to_reconnect_service_1 = require("src/modules/connected-account/services/accounts-to-reconnect.service");
const accounts_to_reconnect_key_value_type_1 = require("src/modules/connected-account/types/accounts-to-reconnect-key-value.type");
let CalendarChannelSyncStatusService = CalendarChannelSyncStatusService_1 = class CalendarChannelSyncStatusService {
    workspaceOrmManager;
    cacheStorage;
    calendarChannelRepository;
    connectedAccountRepository;
    userWorkspaceRepository;
    accountsToReconnectService;
    metricsService;
    logger = new common_1.Logger(CalendarChannelSyncStatusService_1.name);
    constructor(workspaceOrmManager, cacheStorage, calendarChannelRepository, connectedAccountRepository, userWorkspaceRepository, accountsToReconnectService, metricsService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.cacheStorage = cacheStorage;
        this.calendarChannelRepository = calendarChannelRepository;
        this.connectedAccountRepository = connectedAccountRepository;
        this.userWorkspaceRepository = userWorkspaceRepository;
        this.accountsToReconnectService = accountsToReconnectService;
        this.metricsService = metricsService;
    }
    async markAsCalendarEventListFetchPending(calendarChannelIds, workspaceId, preserveSyncStageStartedAt = false) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING,
                ...(!preserveSyncStageStartedAt
                    ? { syncStageStartedAt: null }
                    : {}),
            });
        }, authContext, { lite: true });
    }
    async markAsCalendarEventListFetchOngoing(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_ONGOING,
                syncStatus: types_1.CalendarChannelSyncStatus.ONGOING,
                syncStageStartedAt: new Date().toISOString(),
            });
        }, authContext, { lite: true });
    }
    async resetAndMarkAsCalendarEventListFetchPending(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        for (const calendarChannelId of calendarChannelIds) {
            await this.cacheStorage.del(`calendar-events-to-import:${workspaceId}:${calendarChannelId}`);
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncCursor: '',
                syncStageStartedAt: null,
                throttleFailureCount: 0,
            });
        }, authContext, { lite: true });
        await this.markAsCalendarEventListFetchPending(calendarChannelIds, workspaceId);
    }
    async resetSyncStageStartedAt(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStageStartedAt: null,
            });
        }, authContext, { lite: true });
    }
    async markAsCalendarEventsImportPending(calendarChannelIds, workspaceId, preserveSyncStageStartedAt = false) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_PENDING,
                ...(!preserveSyncStageStartedAt
                    ? { syncStageStartedAt: null }
                    : {}),
            });
        }, authContext, { lite: true });
    }
    async markAsCalendarEventsImportOngoing(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_ONGOING,
                syncStatus: types_1.CalendarChannelSyncStatus.ONGOING,
                syncStageStartedAt: new Date().toISOString(),
            });
        }, authContext, { lite: true });
    }
    async markAsCalendarEventSyncCompleted(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING,
                syncStatus: types_1.CalendarChannelSyncStatus.ACTIVE,
                throttleFailureCount: 0,
                syncStageStartedAt: null,
                syncedAt: new Date().toISOString(),
            });
        }, authContext, { lite: true });
        await this.markAsCalendarEventListFetchPending(calendarChannelIds, workspaceId);
        await this.metricsService.incrementCounterForEvents({
            key: metrics_keys_type_1.MetricsKeys.CalendarEventSyncJobActive,
            eventIds: calendarChannelIds,
        });
    }
    async markAsFailedUnknownAndFlushCalendarEventsToImport(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        this.logger.warn(`Marking calendar channels [${calendarChannelIds.join(', ')}] as ${types_1.CalendarChannelSyncStatus.FAILED_UNKNOWN} in workspace ${workspaceId}`);
        for (const calendarChannelId of calendarChannelIds) {
            await this.cacheStorage.del(`calendar-events-to-import:${workspaceId}:${calendarChannelId}`);
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStatus: types_1.CalendarChannelSyncStatus.FAILED_UNKNOWN,
                syncStage: types_1.CalendarChannelSyncStage.FAILED,
            });
        }, authContext, { lite: true });
        await this.metricsService.incrementCounterForEvents({
            key: metrics_keys_type_1.MetricsKeys.CalendarEventSyncJobFailedUnknown,
            eventIds: calendarChannelIds,
        });
    }
    async markAsFailedInsufficientPermissionsAndFlushCalendarEventsToImport(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        this.logger.warn(`Marking calendar channels [${calendarChannelIds.join(', ')}] as ${types_1.CalendarChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS} in workspace ${workspaceId}`);
        for (const calendarChannelId of calendarChannelIds) {
            await this.cacheStorage.del(`calendar-events-to-import:${workspaceId}:${calendarChannelId}`);
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.calendarChannelRepository.update({ id: (0, typeorm_2.In)(calendarChannelIds), workspaceId }, {
                syncStatus: types_1.CalendarChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS,
                syncStage: types_1.CalendarChannelSyncStage.FAILED,
            });
            const calendarChannels = await this.calendarChannelRepository.find({
                select: ['id', 'connectedAccountId'],
                where: { id: (0, typeorm_2.Any)(calendarChannelIds), workspaceId },
            });
            const connectedAccountIds = calendarChannels.map((calendarChannel) => calendarChannel.connectedAccountId);
            await this.connectedAccountRepository.update({ id: (0, typeorm_2.Any)(connectedAccountIds), workspaceId }, {
                authFailedAt: new Date(),
            });
            await this.addToAccountsToReconnect(calendarChannels.map((calendarChannel) => calendarChannel.id), workspaceId);
        }, authContext, { lite: true });
        await this.metricsService.incrementCounterForEvents({
            key: metrics_keys_type_1.MetricsKeys.CalendarEventSyncJobFailedInsufficientPermissions,
            eventIds: calendarChannelIds,
        });
    }
    async addToAccountsToReconnect(calendarChannelIds, workspaceId) {
        if (!calendarChannelIds.length) {
            return;
        }
        const calendarChannels = await this.calendarChannelRepository.find({
            select: ['id', 'connectedAccountId'],
            where: {
                id: (0, typeorm_2.Any)(calendarChannelIds),
                workspaceId,
            },
        });
        for (const calendarChannel of calendarChannels) {
            const connectedAccount = await this.connectedAccountRepository.findOne({
                where: { id: calendarChannel.connectedAccountId, workspaceId },
            });
            if (!connectedAccount) {
                continue;
            }
            const userWorkspace = await this.userWorkspaceRepository.findOne({
                where: { id: connectedAccount.userWorkspaceId },
                select: ['userId'],
            });
            if (!userWorkspace) {
                continue;
            }
            const userId = userWorkspace.userId;
            const connectedAccountId = connectedAccount.id;
            await this.accountsToReconnectService.addAccountToReconnectByKey(accounts_to_reconnect_key_value_type_1.AccountsToReconnectKeys.ACCOUNTS_TO_RECONNECT_INSUFFICIENT_PERMISSIONS, userId, workspaceId, connectedAccountId);
        }
    }
};
exports.CalendarChannelSyncStatusService = CalendarChannelSyncStatusService;
exports.CalendarChannelSyncStatusService = CalendarChannelSyncStatusService = CalendarChannelSyncStatusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleCalendar)),
    __param(2, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _b : Object, typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, typeof (_c = typeof accounts_to_reconnect_service_1.AccountsToReconnectService !== "undefined" && accounts_to_reconnect_service_1.AccountsToReconnectService) === "function" ? _c : Object, typeof (_d = typeof metrics_service_1.MetricsService !== "undefined" && metrics_service_1.MetricsService) === "function" ? _d : Object])
], CalendarChannelSyncStatusService);
