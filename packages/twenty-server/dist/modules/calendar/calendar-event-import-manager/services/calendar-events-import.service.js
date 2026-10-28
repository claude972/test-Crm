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
exports.CalendarEventsImportService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_import_batch_size_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-event-import-batch-size");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const calendar_event_import_exception_handler_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service");
const filter_events_and_return_events_to_remove_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/filter-events-and-return-events-to-remove.util");
let CalendarEventsImportService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarEventsImportService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventsImportService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
                                eventExternalId: (0, typeorm_1.Any)(eventExternalIdsToRemove),
                                calendarChannelId: calendarChannel.id,
                            },
                            select: { calendarEventId: true },
                        });
                        await calendarChannelEventAssociationRepository.delete({
                            eventExternalId: (0, typeorm_1.Any)(eventExternalIdsToRemove),
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
    return CalendarEventsImportService = _classThis;
})();
exports.CalendarEventsImportService = CalendarEventsImportService;
