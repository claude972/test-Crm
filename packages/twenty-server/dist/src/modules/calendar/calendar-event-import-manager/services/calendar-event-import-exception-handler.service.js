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
var CalendarEventImportErrorHandlerService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventImportErrorHandlerService = exports.CalendarEventImportSyncStep = void 0;
const common_1 = require("@nestjs/common");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const connected_account_refresh_tokens_exception_1 = require("src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception");
const kovaa_lab_orm_exception_1 = require("src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const calendar_throttle_max_attempts_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-throttle-max-attempts");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const calendar_event_import_exception_1 = require("src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception");
const calendar_channel_sync_status_service_1 = require("src/modules/calendar/common/services/calendar-channel-sync-status.service");
var CalendarEventImportSyncStep;
(function (CalendarEventImportSyncStep) {
    CalendarEventImportSyncStep["CALENDAR_EVENT_LIST_FETCH"] = "CALENDAR_EVENT_LIST_FETCH";
    CalendarEventImportSyncStep["CALENDAR_EVENTS_IMPORT"] = "CALENDAR_EVENTS_IMPORT";
})(CalendarEventImportSyncStep || (exports.CalendarEventImportSyncStep = CalendarEventImportSyncStep = {}));
let CalendarEventImportErrorHandlerService = CalendarEventImportErrorHandlerService_1 = class CalendarEventImportErrorHandlerService {
    calendarChannelRepository;
    calendarChannelSyncStatusService;
    exceptionHandlerService;
    logger = new common_1.Logger(CalendarEventImportErrorHandlerService_1.name);
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
exports.CalendarEventImportErrorHandlerService = CalendarEventImportErrorHandlerService;
exports.CalendarEventImportErrorHandlerService = CalendarEventImportErrorHandlerService = CalendarEventImportErrorHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _a : Object, calendar_channel_sync_status_service_1.CalendarChannelSyncStatusService, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], CalendarEventImportErrorHandlerService);
