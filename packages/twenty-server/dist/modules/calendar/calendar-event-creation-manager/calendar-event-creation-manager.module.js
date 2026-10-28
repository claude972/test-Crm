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
let CalendarEventCreationManagerModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
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
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarEventCreationManagerModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventCreationManagerModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return CalendarEventCreationManagerModule = _classThis;
})();
exports.CalendarEventCreationManagerModule = CalendarEventCreationManagerModule;
