"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CALENDAR_ONGOING_STALE_SYNC_STAGES = void 0;
const types_1 = require("kovaa-lab-shared/types");
exports.CALENDAR_ONGOING_STALE_SYNC_STAGES = [
    types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_ONGOING,
    types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_ONGOING,
    types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_SCHEDULED,
    types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_SCHEDULED,
];
