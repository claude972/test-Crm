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
exports.CalendarEventImportErrorHandlerService = exports.CalendarEventImportSyncStep = void 0;
const common_1 = require("@nestjs/common");
const connected_account_refresh_tokens_exception_1 = require("src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception");
const kovaa_lab_orm_exception_1 = require("src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception");
const calendar_throttle_max_attempts_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-throttle-max-attempts");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const calendar_event_import_exception_1 = require("src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception");
var CalendarEventImportSyncStep;
(function (CalendarEventImportSyncStep) {
    CalendarEventImportSyncStep["CALENDAR_EVENT_LIST_FETCH"] = "CALENDAR_EVENT_LIST_FETCH";
    CalendarEventImportSyncStep["CALENDAR_EVENTS_IMPORT"] = "CALENDAR_EVENTS_IMPORT";
})(CalendarEventImportSyncStep || (exports.CalendarEventImportSyncStep = CalendarEventImportSyncStep = {}));
let CalendarEventImportErrorHandlerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarEventImportErrorHandlerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventImportErrorHandlerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        calendarChannelRepository;
        calendarChannelSyncStatusService;
        exceptionHandlerService;
        logger = new common_1.Logger(CalendarEventImportErrorHandlerService.name);
        constructor(calendarChannelRepository, calendarChannelSyncStatusService, exceptionHandlerService) {
            this.calendarChannelRepository = calendarChannelRepository;
            this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
            this.exceptionHandlerService = exceptionHandlerService;
        }
        async handleDriverException(exception, syncStep, calendarChannel, workspaceId) {
            switch (exception.code) {
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.NOT_FOUND:
                    await this.handleNotFoundException(syncStep, calendarChannel, workspaceId);
                    break;
                case kovaa_lab_orm_exception_1.KovaaLabCRMOrmExceptionCode.QUERY_READ_TIMEOUT:
                case kovaa_lab_orm_exception_1.KovaaLabCRMOrmExceptionCode.TRANSIENT_DATABASE_ERROR:
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.TEMPORARY_ERROR:
                case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.TEMPORARY_NETWORK_ERROR:
                    await this.handleTemporaryException(syncStep, calendarChannel, workspaceId);
                    break;
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS:
                case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.REFRESH_TOKEN_NOT_FOUND:
                case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.INVALID_REFRESH_TOKEN:
                    await this.handleInsufficientPermissionsException(calendarChannel, workspaceId);
                    break;
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.SYNC_CURSOR_ERROR:
                    await this.handleSyncCursorErrorException(calendarChannel, workspaceId);
                    break;
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.CHANNEL_MISCONFIGURED:
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.UNKNOWN:
                case calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.UNKNOWN_NETWORK_ERROR:
                case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.ACCESS_TOKEN_NOT_FOUND:
                case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.PROVIDER_NOT_SUPPORTED:
                default:
                    await this.handleUnknownException(exception, calendarChannel, workspaceId);
                    break;
            }
        }
        async handleSyncCursorErrorException(calendarChannel, workspaceId) {
            this.logger.debug(`CalendarChannelId: ${calendarChannel.id} - Sync cursor error, resetting and rescheduling`);
            await this.calendarChannelSyncStatusService.resetAndMarkAsCalendarEventListFetchPending([calendarChannel.id], workspaceId);
        }
        async handleTemporaryException(syncStep, calendarChannel, workspaceId) {
            if (calendarChannel.throttleFailureCount >= calendar_throttle_max_attempts_1.CALENDAR_THROTTLE_MAX_ATTEMPTS) {
                await this.calendarChannelSyncStatusService.markAsFailedUnknownAndFlushCalendarEventsToImport([calendarChannel.id], workspaceId);
                const calendarEventImportException = new calendar_event_import_exception_1.CalendarEventImportException(`Temporary error occurred ${calendar_throttle_max_attempts_1.CALENDAR_THROTTLE_MAX_ATTEMPTS} times while importing calendar events for calendar channel ${calendarChannel.id} in workspace ${workspaceId} with throttleFailureCount ${calendarChannel.throttleFailureCount}`, calendar_event_import_exception_1.CalendarEventImportExceptionCode.UNKNOWN);
                this.exceptionHandlerService.captureExceptions([calendarEventImportException], {
                    additionalData: {
                        calendarChannelId: calendarChannel.id,
                        syncStep,
                        throttleFailureCount: calendarChannel.throttleFailureCount,
                    },
                    workspace: {
                        id: workspaceId,
                    },
                });
                throw calendarEventImportException;
            }
            await this.calendarChannelRepository.increment(workspaceId, { id: calendarChannel.id }, 'throttleFailureCount', 1);
            switch (syncStep) {
                case CalendarEventImportSyncStep.CALENDAR_EVENT_LIST_FETCH:
                    await this.calendarChannelSyncStatusService.markAsCalendarEventListFetchPending([calendarChannel.id], workspaceId, true);
                    break;
                case CalendarEventImportSyncStep.CALENDAR_EVENTS_IMPORT:
                    await this.calendarChannelSyncStatusService.markAsCalendarEventsImportPending([calendarChannel.id], workspaceId, true);
                    break;
                default:
                    break;
            }
        }
        async handleInsufficientPermissionsException(calendarChannel, workspaceId) {
            await this.calendarChannelSyncStatusService.markAsFailedInsufficientPermissionsAndFlushCalendarEventsToImport([calendarChannel.id], workspaceId);
        }
        async handleUnknownException(exception, calendarChannel, workspaceId) {
            await this.calendarChannelSyncStatusService.markAsFailedUnknownAndFlushCalendarEventsToImport([calendarChannel.id], workspaceId);
            const calendarEventImportException = new calendar_event_import_exception_1.CalendarEventImportException(`Unknown error importing calendar events for calendar channel ${calendarChannel.id} in workspace ${workspaceId}: ${exception.message}`, calendar_event_import_exception_1.CalendarEventImportExceptionCode.UNKNOWN);
            this.logger.error(exception);
            this.exceptionHandlerService.captureExceptions([calendarEventImportException], {
                additionalData: {
                    calendarChannelId: calendarChannel.id,
                    exceptionMessage: exception.message,
                },
                workspace: {
                    id: workspaceId,
                },
            });
            throw calendarEventImportException;
        }
        async handleNotFoundException(syncStep, calendarChannel, workspaceId) {
            if (syncStep === CalendarEventImportSyncStep.CALENDAR_EVENT_LIST_FETCH) {
                return;
            }
            await this.calendarChannelSyncStatusService.resetAndMarkAsCalendarEventListFetchPending([calendarChannel.id], workspaceId);
        }
    };
    return CalendarEventImportErrorHandlerService = _classThis;
})();
exports.CalendarEventImportErrorHandlerService = CalendarEventImportErrorHandlerService;
