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
var CreateCalendarEventService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCalendarEventService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const caldav_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/caldav/services/caldav-create-event.service");
const google_calendar_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/google-calendar/services/google-calendar-create-event.service");
const microsoft_calendar_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/microsoft-calendar/services/microsoft-calendar-create-event.service");
const calendar_event_creation_exception_1 = require("src/modules/calendar/calendar-event-creation-manager/exceptions/calendar-event-creation.exception");
const calendar_save_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-save-events.service");
let CreateCalendarEventService = CreateCalendarEventService_1 = class CreateCalendarEventService {
    googleCalendarCreateEventService;
    microsoftCalendarCreateEventService;
    calDavCreateEventService;
    calendarSaveEventsService;
    logger = new common_1.Logger(CreateCalendarEventService_1.name);
    constructor(googleCalendarCreateEventService, microsoftCalendarCreateEventService, calDavCreateEventService, calendarSaveEventsService) {
        this.googleCalendarCreateEventService = googleCalendarCreateEventService;
        this.microsoftCalendarCreateEventService = microsoftCalendarCreateEventService;
        this.calDavCreateEventService = calDavCreateEventService;
        this.calendarSaveEventsService = calendarSaveEventsService;
    }
    async createComposedCalendarEvent(data) {
        switch (data.connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.googleCalendarCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftCalendarCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.calDavCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
            default:
                throw new calendar_event_creation_exception_1.CalendarEventCreationException(`Calendar event creation is not supported for provider ${data.connectedAccount.provider}`, calendar_event_creation_exception_1.CalendarEventCreationExceptionCode.PROVIDER_NOT_SUPPORTED);
        }
    }
    // Non-fatal on failure: the next provider sync reconciles the event via its external id
    async persistCalendarEvent(createdEvent, data, workspaceId) {
        try {
            const { calendarEventIds } = await this.calendarSaveEventsService.saveCalendarEventsAndEnqueueContactCreationJob([createdEvent], data.calendarChannel, data.connectedAccount, workspaceId);
            return calendarEventIds[0] ?? null;
        }
        catch (persistenceError) {
            this.logger.warn(`Failed to persist created calendar event (sync will recover): ${persistenceError}`);
            return null;
        }
    }
};
exports.CreateCalendarEventService = CreateCalendarEventService;
exports.CreateCalendarEventService = CreateCalendarEventService = CreateCalendarEventService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof google_calendar_create_event_service_1.GoogleCalendarCreateEventService !== "undefined" && google_calendar_create_event_service_1.GoogleCalendarCreateEventService) === "function" ? _a : Object, typeof (_b = typeof microsoft_calendar_create_event_service_1.MicrosoftCalendarCreateEventService !== "undefined" && microsoft_calendar_create_event_service_1.MicrosoftCalendarCreateEventService) === "function" ? _b : Object, caldav_create_event_service_1.CalDavCreateEventService,
        calendar_save_events_service_1.CalendarSaveEventsService])
], CreateCalendarEventService);
