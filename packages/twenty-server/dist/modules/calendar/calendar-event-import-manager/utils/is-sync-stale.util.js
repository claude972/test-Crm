"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncStale = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const calendar_import_ongoing_sync_timeout_constant_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-import-ongoing-sync-timeout.constant");
const isSyncStale = (syncStageStartedAt) => {
    if (!(0, utils_1.isDefined)(syncStageStartedAt)) {
        return true;
    }
    const syncStageStartedTime = new Date(syncStageStartedAt).getTime();
    if (isNaN(syncStageStartedTime)) {
        throw new Error('Invalid date format');
    }
    return (Date.now() - syncStageStartedTime > calendar_import_ongoing_sync_timeout_constant_1.CALENDAR_IMPORT_ONGOING_SYNC_TIMEOUT);
};
exports.isSyncStale = isSyncStale;
