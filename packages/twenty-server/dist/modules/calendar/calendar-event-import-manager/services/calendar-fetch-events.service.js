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
exports.CalendarFetchEventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_import_exception_handler_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service");
let CalendarFetchEventsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarFetchEventsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarFetchEventsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cacheStorage;
        workspaceOrmManager;
        calendarChannelRepository;
        calendarChannelSyncStatusService;
        getCalendarEventsService;
        calendarEventImportErrorHandlerService;
        calendarEventCleanerService;
        logger = new common_1.Logger(CalendarFetchEventsService.name);
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
                                eventExternalId: (0, typeorm_1.Any)(calendarEventIdsToDelete),
                                calendarChannelId: calendarChannel.id,
                            },
                            select: { calendarEventId: true },
                        });
                        await calendarChannelEventAssociationRepository.delete({
                            eventExternalId: (0, typeorm_1.Any)(calendarEventIdsToDelete),
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
    return CalendarFetchEventsService = _classThis;
})();
exports.CalendarFetchEventsService = CalendarFetchEventsService;
