"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarModule = void 0;
const common_1 = require("@nestjs/common");
const calendar_event_creation_manager_module_1 = require("src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module");
const calendar_blocklist_manager_module_1 = require("src/modules/calendar/blocklist-manager/calendar-blocklist-manager.module");
const calendar_event_cleaner_module_1 = require("src/modules/calendar/calendar-event-cleaner/calendar-event-cleaner.module");
const calendar_event_import_manager_module_1 = require("src/modules/calendar/calendar-event-import-manager/calendar-event-import-manager.module");
const calendar_event_participant_manager_module_1 = require("src/modules/calendar/calendar-event-participant-manager/calendar-event-participant-manager.module");
const calendar_common_module_1 = require("src/modules/calendar/common/calendar-common.module");
let CalendarModule = class CalendarModule {
};
exports.CalendarModule = CalendarModule;
exports.CalendarModule = CalendarModule = __decorate([
    (0, common_1.Module)({
        imports: [
            calendar_event_creation_manager_module_1.CalendarEventCreationManagerModule,
            calendar_blocklist_manager_module_1.CalendarBlocklistManagerModule,
            calendar_event_cleaner_module_1.CalendarEventCleanerModule,
            calendar_event_import_manager_module_1.CalendarEventImportManagerModule,
            calendar_event_participant_manager_module_1.CalendarEventParticipantManagerModule,
            calendar_common_module_1.CalendarCommonModule,
        ],
        providers: [],
        exports: [],
    })
], CalendarModule);
