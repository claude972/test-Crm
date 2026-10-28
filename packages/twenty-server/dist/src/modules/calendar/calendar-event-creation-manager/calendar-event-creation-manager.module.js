"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventCreationManagerModule = void 0;
const common_1 = require("@nestjs/common");
const availability_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/availability.service");
const booking_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/booking.service");
const calendar_rdv_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service");
const typeorm_1 = require("@nestjs/typeorm");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const caldav_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/caldav/services/caldav-create-event.service");
const google_calendar_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/google-calendar/services/google-calendar-create-event.service");
const microsoft_calendar_create_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/drivers/microsoft-calendar/services/microsoft-calendar-create-event.service");
const calendar_event_composer_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-event-composer.service");
const create_calendar_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service");
const caldav_driver_module_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/caldav-driver.module");
const calendar_event_import_manager_module_1 = require("src/modules/calendar/calendar-event-import-manager/calendar-event-import-manager.module");
const oauth2_client_manager_module_1 = require("src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module");
let CalendarEventCreationManagerModule = class CalendarEventCreationManagerModule {
};
exports.CalendarEventCreationManagerModule = CalendarEventCreationManagerModule;
exports.CalendarEventCreationManagerModule = CalendarEventCreationManagerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([connected_account_entity_1.ConnectedAccountEntity, calendar_channel_entity_1.CalendarChannelEntity]),
            oauth2_client_manager_module_1.OAuth2ClientManagerModule,
            calendar_event_import_manager_module_1.CalendarEventImportManagerModule,
            caldav_driver_module_1.CalDavDriverModule,
        ],
        providers: [
            calendar_event_composer_service_1.CalendarEventComposerService,
            create_calendar_event_service_1.CreateCalendarEventService,
            availability_service_1.AvailabilityService,
            booking_service_1.BookingService,
            calendar_rdv_service_1.CalendarRdvService, ,
            google_calendar_create_event_service_1.GoogleCalendarCreateEventService,
            microsoft_calendar_create_event_service_1.MicrosoftCalendarCreateEventService,
            caldav_create_event_service_1.CalDavCreateEventService,
        ],
        exports: [calendar_event_composer_service_1.CalendarEventComposerService, create_calendar_event_service_1.CreateCalendarEventService,
            availability_service_1.AvailabilityService,
            booking_service_1.BookingService,
            calendar_rdv_service_1.CalendarRdvService,],
    })
], CalendarEventCreationManagerModule);
