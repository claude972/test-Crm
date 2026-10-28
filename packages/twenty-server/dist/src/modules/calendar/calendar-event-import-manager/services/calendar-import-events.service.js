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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarImportEventsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const caldav_import_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-import-events.service");
const google_calendar_import_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-import-events.service");
const microsoft_calendar_import_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/microsoft-calendar/services/microsoft-calendar-import-events.service");
const calendar_event_import_exception_1 = require("src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception");
let CalendarImportEventsService = class CalendarImportEventsService {
    googleCalendarImportEventsService;
    microsoftCalendarImportEventsService;
    caldavCalendarImportEventsService;
    constructor(googleCalendarImportEventsService, microsoftCalendarImportEventsService, caldavCalendarImportEventsService) {
        this.googleCalendarImportEventsService = googleCalendarImportEventsService;
        this.microsoftCalendarImportEventsService = microsoftCalendarImportEventsService;
        this.caldavCalendarImportEventsService = caldavCalendarImportEventsService;
    }
    async getCalendarEvents(connectedAccount, eventExternalIds) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.googleCalendarImportEventsService.getCalendarEvents(connectedAccount, eventExternalIds);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftCalendarImportEventsService.getCalendarEvents(connectedAccount, eventExternalIds);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.caldavCalendarImportEventsService.getCalendarEvents(connectedAccount.id, eventExternalIds);
            default:
                throw new calendar_event_import_exception_1.CalendarEventImportException(`Provider ${connectedAccount.provider} is not supported`, calendar_event_import_exception_1.CalendarEventImportExceptionCode.PROVIDER_NOT_SUPPORTED);
        }
    }
};
exports.CalendarImportEventsService = CalendarImportEventsService;
exports.CalendarImportEventsService = CalendarImportEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [google_calendar_import_events_service_1.GoogleCalendarImportEventsService, typeof (_a = typeof microsoft_calendar_import_events_service_1.MicrosoftCalendarImportEventsService !== "undefined" && microsoft_calendar_import_events_service_1.MicrosoftCalendarImportEventsService) === "function" ? _a : Object, typeof (_b = typeof caldav_import_events_service_1.CalDavImportEventsService !== "undefined" && caldav_import_events_service_1.CalDavImportEventsService) === "function" ? _b : Object])
], CalendarImportEventsService);
