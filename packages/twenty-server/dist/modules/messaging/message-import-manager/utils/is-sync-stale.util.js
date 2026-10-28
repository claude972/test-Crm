"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncStale = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const messaging_import_ongoing_sync_timeout_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-import-ongoing-sync-timeout.constant");
const isSyncStale = (syncStageStartedAt) => {
    if (!(0, utils_1.isDefined)(syncStageStartedAt)) {
        return true;
    }
    const syncStageStartedTime = new Date(syncStageStartedAt).getTime();
    if (isNaN(syncStageStartedTime)) {
        throw new Error('Invalid date format');
    }
    return (Date.now() - syncStageStartedTime > messaging_import_ongoing_sync_timeout_constant_1.MESSAGING_IMPORT_ONGOING_SYNC_TIMEOUT);
};
exports.isSyncStale = isSyncStale;
