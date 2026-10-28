"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUpstreamSpam = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const upstream_spam_verdict_headers_constant_1 = require("src/modules/messaging/message-import-manager/constants/upstream-spam-verdict-headers.constant");
const isUpstreamSpam = (headers) => Object.entries(upstream_spam_verdict_headers_constant_1.UPSTREAM_SPAM_VERDICT_HEADERS).some(([headerName, spamVerdicts]) => {
    const topmostHeader = headers.find(({ name }) => name.toLowerCase() === headerName);
    if (!(0, utils_1.isDefined)(topmostHeader)) {
        return false;
    }
    return topmostHeader.value
        .split(';')
        .some((token) => spamVerdicts.includes(token.trim().toLowerCase()));
});
exports.isUpstreamSpam = isUpstreamSpam;
