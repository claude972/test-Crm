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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarImportEventsService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const utils_1 = require("kovaa-lab-shared/utils");
const format_google_calendar_event_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/format-google-calendar-event.util");
const parse_gaxios_error_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/parse-gaxios-error.util");
const parse_google_calendar_error_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/parse-google-calendar-error.util");
const google_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider");
let GoogleCalendarImportEventsService = class GoogleCalendarImportEventsService {
    googleOAuth2ClientProvider;
    constructor(googleOAuth2ClientProvider) {
        this.googleOAuth2ClientProvider = googleOAuth2ClientProvider;
    }
    async getCalendarEvents(connectedAccount, eventExternalIds) {
        const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
        const googleCalendarClient = googleapis_1.google.calendar({
            version: 'v3',
            auth: oAuth2Client,
        });
        const fetchedEvents = await Promise.all(eventExternalIds.map((eventExternalId) => googleCalendarClient.events
            .get({ calendarId: 'primary', eventId: eventExternalId })
            .then((response) => response.data)
            .catch((error) => {
            const status = error.response?.status;
            if (status === 404 || status === 410) {
                return null;
            }
            if (!(0, utils_1.isDefined)(status)) {
                throw (0, parse_gaxios_error_util_1.parseGaxiosError)(error);
            }
            throw (0, parse_google_calendar_error_util_1.parseGoogleCalendarError)({
                code: status,
                reason: error.response?.data?.error?.errors?.[0].reason || '',
                message: error.response?.data?.error?.errors?.[0].message || '',
            }, { cause: error });
        })));
        return (0, format_google_calendar_event_util_1.formatGoogleCalendarEvents)(fetchedEvents.filter(utils_1.isDefined));
    }
};
exports.GoogleCalendarImportEventsService = GoogleCalendarImportEventsService;
exports.GoogleCalendarImportEventsService = GoogleCalendarImportEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof google_oauth2_client_provider_1.GoogleOAuth2ClientProvider !== "undefined" && google_oauth2_client_provider_1.GoogleOAuth2ClientProvider) === "function" ? _a : Object])
], GoogleCalendarImportEventsService);
