"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGING_ONGOING_STALE_SYNC_STAGES = void 0;
const types_1 = require("kovaa-lab-shared/types");
exports.MESSAGING_ONGOING_STALE_SYNC_STAGES = [
    types_1.MessageChannelSyncStage.MESSAGES_IMPORT_ONGOING,
    types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_ONGOING,
    types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED,
    types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED,
];
