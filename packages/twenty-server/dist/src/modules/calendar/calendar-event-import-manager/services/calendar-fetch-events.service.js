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
var CalendarFetchEventsService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarFetchEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_cleaner_service_1 = require("src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service");
const calendar_event_import_exception_handler_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service");
const calendar_get_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-get-events.service");
const calendar_channel_sync_status_service_1 = require("src/modules/calendar/common/services/calendar-channel-sync-status.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
let CalendarFetchEventsService = CalendarFetchEventsService_1 = class CalendarFetchEventsService {
    cacheStorage;
    workspaceOrmManager;
    calendarChannelRepository;
    calendarChannelSyncStatusService;
    getCalendarEventsService;
    calendarEventImportErrorHandlerService;
    calendarEventCleanerService;
    logger = new common_1.Logger(CalendarFetchEventsService_1.name);
    constructor(cacheStorage, workspaceOrmManager, calendarChannelRepository, calendarChannelSyncStatusService, getCalendarEventsService, calendarEventImportErrorHandlerService, calendarEventCleanerService) {
        this.cacheStorage = cacheStorage;
        this.workspaceOrmManager = workspaceOrmManager;
        this.calendarChannelRepository = calendarChannelRepository;
        this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
        this.getCalendarEventsService = getCalendarEventsService;
        this.calendarEventImportErrorHandlerService = calendarEventImportErrorHandlerService;
        this.calendarEventCleanerService = calendarEventCleanerService;
    }
    async fetchCalendarEvents(calendarChannel, connectedAccount, workspaceId) {
        this.logger.log(`WorkspaceId: ${workspaceId}, CalendarChannelId: ${calendarChannel.id} - Fetching calendar events`);
        await this.calendarChannelSyncStatusService.markAsCalendarEventListFetchOngoing([calendarChannel.id], workspaceId);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            try {
                const { calendarEventIds, calendarEventIdsToDelete, nextSyncCursor } = await this.getCalendarEventsService.getCalendarEvents(connectedAccount, calendarChannel.syncCursor || undefined);
                if (calendarEventIdsToDelete.length > 0) {
                    const calendarChannelEventAssociationRepository = this.workspaceOrmManager.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                    const associationsToDelete = await calendarChannelEventAssociationRepository.find({
                        where: {
                            eventExternalId: (0, typeorm_2.Any)(calendarEventIdsToDelete),
                            calendarChannelId: calendarChannel.id,
                        },
                        select: { calendarEventId: true },
                    });
                    await calendarChannelEventAssociationRepository.delete({
                        eventExternalId: (0, typeorm_2.Any)(calendarEventIdsToDelete),
                        calendarChannelId: calendarChannel.id,
                    });
                    await this.calendarEventCleanerService.deleteOrphanedCalendarEvents({
                        calendarEventIds: associationsToDelete.map(({ calendarEventId }) => calendarEventId),
                        workspaceId,
                    });
                }
                if (calendarEventIds.length > 0) {
                    await this.cacheStorage.setAdd(`calendar-events-to-import:${workspaceId}:${calendarChannel.id}`, calendarEventIds);
                    await this.calendarChannelSyncStatusService.markAsCalendarEventsImportPending([calendarChannel.id], workspaceId);
                }
                else {
                    await this.calendarChannelSyncStatusService.markAsCalendarEventSyncCompleted([calendarChannel.id], workspaceId);
                }
                await this.calendarChannelRepository.update({ id: calendarChannel.id, workspaceId }, {
                    syncCursor: nextSyncCursor,
                });
            }
            catch (error) {
                this.logger.error(`WorkspaceId: ${workspaceId}, CalendarChannelId: ${calendarChannel.id} - Calendar event fetch error: ${error.message}`);
                await this.calendarEventImportErrorHandlerService.handleDriverException(error, calendar_event_import_exception_handler_service_1.CalendarEventImportSyncStep.CALENDAR_EVENT_LIST_FETCH, calendarChannel, workspaceId);
            }
        }, authContext, { lite: true });
    }
};
exports.CalendarFetchEventsService = CalendarFetchEventsService;
exports.CalendarFetchEventsService = CalendarFetchEventsService = CalendarFetchEventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleCalendar)),
    __param(2, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeorm_2.Repository,
        calendar_channel_sync_status_service_1.CalendarChannelSyncStatusService,
        calendar_get_events_service_1.CalendarGetCalendarEventsService,
        calendar_event_import_exception_handler_service_1.CalendarEventImportErrorHandlerService,
        calendar_event_cleaner_service_1.CalendarEventCleanerService])
], CalendarFetchEventsService);
