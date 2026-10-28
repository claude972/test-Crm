"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMessageFromHeader = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const mime_encode_util_1 = require("src/modules/messaging/message-import-manager/utils/mime-encode.util");
const formatMessageFromHeader = ({ fromEmail, fromName, }) => {
    return (0, utils_1.formatEmailAddress)({
        address: fromEmail,
        name: (0, guards_1.isNonEmptyString)(fromName) ? (0, mime_encode_util_1.mimeEncode)(fromName) : undefined,
    });
};
exports.formatMessageFromHeader = formatMessageFromHeader;
