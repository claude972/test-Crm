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
exports.CalendarChannelSyncStatusService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const metrics_keys_type_1 = require("src/engine/core-modules/metrics/types/metrics-keys.type");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const accounts_to_reconnect_key_value_type_1 = require("src/modules/connected-account/types/accounts-to-reconnect-key-value.type");
let CalendarChannelSyncStatusService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarChannelSyncStatusService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarChannelSyncStatusService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        cacheStorage;
        calendarChannelRepository;
        connectedAccountRepository;
        userWorkspaceRepository;
        accountsToReconnectService;
        metricsService;
        logger = new common_1.Logger(CalendarChannelSyncStatusService.name);
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
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
                await this.calendarChannelRepository.update({ id: (0, typeorm_1.In)(calendarChannelIds), workspaceId }, {
                    syncStatus: types_1.CalendarChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS,
                    syncStage: types_1.CalendarChannelSyncStage.FAILED,
                });
                const calendarChannels = await this.calendarChannelRepository.find({
                    select: ['id', 'connectedAccountId'],
                    where: { id: (0, typeorm_1.Any)(calendarChannelIds), workspaceId },
                });
                const connectedAccountIds = calendarChannels.map((calendarChannel) => calendarChannel.connectedAccountId);
                await this.connectedAccountRepository.update({ id: (0, typeorm_1.Any)(connectedAccountIds), workspaceId }, {
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
                    id: (0, typeorm_1.Any)(calendarChannelIds),
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
    return CalendarChannelSyncStatusService = _classThis;
})();
exports.CalendarChannelSyncStatusService = CalendarChannelSyncStatusService;
