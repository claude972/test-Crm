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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventsImportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const blocklist_repository_1 = require("src/modules/blocklist/repositories/blocklist.repository");
const calendar_event_cleaner_service_1 = require("src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service");
const calendar_event_import_batch_size_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-event-import-batch-size");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const calendar_event_import_exception_handler_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service");
const calendar_import_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-import-events.service");
const calendar_save_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-save-events.service");
const filter_events_and_return_events_to_remove_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/filter-events-and-return-events-to-remove.util");
const calendar_channel_sync_status_service_1 = require("src/modules/calendar/common/services/calendar-channel-sync-status.service");
const email_alias_manager_service_1 = require("src/modules/connected-account/email-alias-manager/services/email-alias-manager.service");
let CalendarEventsImportService = class CalendarEventsImportService {
    cacheStorage;
    workspaceOrmManager;
    blocklistRepository;
    calendarEventCleanerService;
    calendarChannelSyncStatusService;
    calendarSaveEventsService;
    calendarEventImportErrorHandlerService;
    calendarImportEventsService;
    emailAliasManagerService;
    userWorkspaceRepository;
    constructor(cacheStorage, workspaceOrmManager, blocklistRepository, calendarEventCleanerService, calendarChannelSyncStatusService, calendarSaveEventsService, calendarEventImportErrorHandlerService, calendarImportEventsService, emailAliasManagerService, userWorkspaceRepository) {
        this.cacheStorage = cacheStorage;
        this.workspaceOrmManager = workspaceOrmManager;
        this.blocklistRepository = blocklistRepository;
        this.calendarEventCleanerService = calendarEventCleanerService;
        this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
        this.calendarSaveEventsService = calendarSaveEventsService;
        this.calendarEventImportErrorHandlerService = calendarEventImportErrorHandlerService;
        this.calendarImportEventsService = calendarImportEventsService;
        this.emailAliasManagerService = emailAliasManagerService;
        this.userWorkspaceRepository = userWorkspaceRepository;
    }
    async processCalendarEventsImport(calendarChannel, connectedAccount, workspaceId) {
        await this.calendarChannelSyncStatusService.markAsCalendarEventsImportOngoing([calendarChannel.id], workspaceId);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            try {
                const eventIdsToFetch = await this.cacheStorage.setPop(`calendar-events-to-import:${workspaceId}:${calendarChannel.id}`, calendar_event_import_batch_size_1.CALENDAR_EVENT_IMPORT_BATCH_SIZE);
                if (!eventIdsToFetch || eventIdsToFetch.length === 0) {
                    await this.calendarChannelSyncStatusService.markAsCalendarEventSyncCompleted([calendarChannel.id], workspaceId);
                    return;
                }
                const calendarEvents = await this.calendarImportEventsService.getCalendarEvents(connectedAccount, eventIdsToFetch);
                const userWorkspace = await this.userWorkspaceRepository.findOne({
                    where: {
                        id: connectedAccount
                            .userWorkspaceId,
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
                if (!(0, utils_1.isDefined)(connectedAccount.handleAliases)) {
                    connectedAccount.handleAliases =
                        await this.emailAliasManagerService.refreshHandleAliases(connectedAccount, workspaceId);
                }
                if (!(0, utils_1.isDefined)(connectedAccount.handleAliases) ||
                    !(0, utils_1.isDefined)(calendarChannel.handle)) {
                    throw new calendar_event_import_driver_exception_1.CalendarEventImportDriverException('Calendar channel handle or Handle aliases are required', calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.CHANNEL_MISCONFIGURED);
                }
                const { filteredEvents, eventsToRemove } = (0, filter_events_and_return_events_to_remove_util_1.filterEventsAndReturnEventsToRemove)([calendarChannel.handle, ...connectedAccount.handleAliases], calendarEvents, blocklist
                    .map((blocklistItem) => blocklistItem.handle)
                    .filter(utils_1.isDefined), calendarChannel.excludePrivateEvents);
                const eventExternalIdsToRemove = eventsToRemove.map((event) => event.id);
                const BATCH_SIZE = 1000;
                for (let i = 0; i < filteredEvents.length; i = i + BATCH_SIZE) {
                    const eventsBatch = filteredEvents.slice(i, i + BATCH_SIZE);
                    await this.calendarSaveEventsService.saveCalendarEventsAndEnqueueContactCreationJob(eventsBatch, calendarChannel, connectedAccount, workspaceId);
                }
                if (eventExternalIdsToRemove.length > 0) {
                    const calendarChannelEventAssociationRepository = this.workspaceOrmManager.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                    const associationsToDelete = await calendarChannelEventAssociationRepository.find({
                        where: {
                            eventExternalId: (0, typeorm_2.Any)(eventExternalIdsToRemove),
                            calendarChannelId: calendarChannel.id,
                        },
                        select: { calendarEventId: true },
                    });
                    await calendarChannelEventAssociationRepository.delete({
                        eventExternalId: (0, typeorm_2.Any)(eventExternalIdsToRemove),
                        calendarChannelId: calendarChannel.id,
                    });
                    await this.calendarEventCleanerService.deleteOrphanedCalendarEvents({
                        calendarEventIds: associationsToDelete.map(({ calendarEventId }) => calendarEventId),
                        workspaceId,
                    });
                }
                if (eventIdsToFetch.length < calendar_event_import_batch_size_1.CALENDAR_EVENT_IMPORT_BATCH_SIZE) {
                    await this.calendarChannelSyncStatusService.markAsCalendarEventSyncCompleted([calendarChannel.id], workspaceId);
                }
                else {
                    await this.calendarChannelSyncStatusService.markAsCalendarEventsImportPending([calendarChannel.id], workspaceId);
                }
            }
            catch (error) {
                await this.calendarEventImportErrorHandlerService.handleDriverException(error, calendar_event_import_exception_handler_service_1.CalendarEventImportSyncStep.CALENDAR_EVENTS_IMPORT, calendarChannel, workspaceId);
            }
        }, authContext, { lite: true });
    }
};
exports.CalendarEventsImportService = CalendarEventsImportService;
exports.CalendarEventsImportService = CalendarEventsImportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleCalendar)),
    __param(9, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeof (_c = typeof blocklist_repository_1.BlocklistRepository !== "undefined" && blocklist_repository_1.BlocklistRepository) === "function" ? _c : Object, calendar_event_cleaner_service_1.CalendarEventCleanerService,
        calendar_channel_sync_status_service_1.CalendarChannelSyncStatusService,
        calendar_save_events_service_1.CalendarSaveEventsService,
        calendar_event_import_exception_handler_service_1.CalendarEventImportErrorHandlerService,
        calendar_import_events_service_1.CalendarImportEventsService, typeof (_d = typeof email_alias_manager_service_1.EmailAliasManagerService !== "undefined" && email_alias_manager_service_1.EmailAliasManagerService) === "function" ? _d : Object, typeorm_2.Repository])
], CalendarEventsImportService);
