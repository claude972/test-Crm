"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSyncCursor = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const parseSyncCursor = (cursor) => {
    if (!(0, utils_1.isDefined)(cursor)) {
        return null;
    }
    try {
        return JSON.parse(cursor);
    }
    catch {
        return null;
    }
};
exports.parseSyncCursor = parseSyncCursor;
