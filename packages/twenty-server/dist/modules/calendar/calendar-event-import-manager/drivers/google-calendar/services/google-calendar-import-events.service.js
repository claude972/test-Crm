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
exports.GoogleCalendarImportEventsService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const utils_1 = require("kovaa-lab-shared/utils");
const format_google_calendar_event_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/format-google-calendar-event.util");
const parse_gaxios_error_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/parse-gaxios-error.util");
const parse_google_calendar_error_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/parse-google-calendar-error.util");
let GoogleCalendarImportEventsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GoogleCalendarImportEventsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GoogleCalendarImportEventsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return GoogleCalendarImportEventsService = _classThis;
})();
exports.GoogleCalendarImportEventsService = GoogleCalendarImportEventsService;
