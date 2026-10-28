"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInvalidSyncTokenResponse = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const isInvalidSyncTokenResponse = (responses) => {
    const DAVResponse = responses[0];
    if (!(0, utils_1.isDefined)(DAVResponse) || DAVResponse.status !== 403)
        return false;
    const body = (0, guards_1.isNonEmptyString)(DAVResponse.raw)
        ? DAVResponse.raw
        : JSON.stringify(DAVResponse.raw ?? {});
    return body.includes('valid-sync-token') || body.includes('validSyncToken');
};
exports.isInvalidSyncTokenResponse = isInvalidSyncTokenResponse;
