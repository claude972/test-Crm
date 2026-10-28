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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarGetCalendarEventsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const caldav_get_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-get-events.service");
const google_calendar_get_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-get-events.service");
const microsoft_calendar_get_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/microsoft-calendar/services/microsoft-calendar-get-events.service");
const calendar_event_import_exception_1 = require("src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception");
let CalendarGetCalendarEventsService = class CalendarGetCalendarEventsService {
    googleCalendarGetEventsService;
    microsoftCalendarGetEventsService;
    caldavCalendarGetEventsService;
    constructor(googleCalendarGetEventsService, microsoftCalendarGetEventsService, caldavCalendarGetEventsService) {
        this.googleCalendarGetEventsService = googleCalendarGetEventsService;
        this.microsoftCalendarGetEventsService = microsoftCalendarGetEventsService;
        this.caldavCalendarGetEventsService = caldavCalendarGetEventsService;
    }
    async getCalendarEvents(connectedAccount, syncCursor) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.googleCalendarGetEventsService.getCalendarEvents(connectedAccount, syncCursor);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftCalendarGetEventsService.getCalendarEvents(connectedAccount, syncCursor);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.caldavCalendarGetEventsService.getCalendarEvents(connectedAccount.id, syncCursor);
            default:
                throw new calendar_event_import_exception_1.CalendarEventImportException(`Provider ${connectedAccount.provider} is not supported`, calendar_event_import_exception_1.CalendarEventImportExceptionCode.PROVIDER_NOT_SUPPORTED);
        }
    }
};
exports.CalendarGetCalendarEventsService = CalendarGetCalendarEventsService;
exports.CalendarGetCalendarEventsService = CalendarGetCalendarEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof google_calendar_get_events_service_1.GoogleCalendarGetEventsService !== "undefined" && google_calendar_get_events_service_1.GoogleCalendarGetEventsService) === "function" ? _a : Object, typeof (_b = typeof microsoft_calendar_get_events_service_1.MicrosoftCalendarGetEventsService !== "undefined" && microsoft_calendar_get_events_service_1.MicrosoftCalendarGetEventsService) === "function" ? _b : Object, typeof (_c = typeof caldav_get_events_service_1.CalDavGetEventsService !== "undefined" && caldav_get_events_service_1.CalDavGetEventsService) === "function" ? _c : Object])
], CalendarGetCalendarEventsService);
