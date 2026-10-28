"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGmailMessage = void 0;
const assert_1 = __importDefault(require("assert"));
const utils_1 = require("kovaa-lab-shared/utils");
const get_attachment_data_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/get-attachment-data.util");
const get_body_data_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/get-body-data.util");
const get_property_from_headers_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/get-property-from-headers.util");
const safe_parse_email_address_address_util_1 = require("src/modules/messaging/message-import-manager/utils/safe-parse-email-address-address.util");
const safe_parse_email_addresses_util_1 = require("src/modules/messaging/message-import-manager/utils/safe-parse-email-addresses.util");
const parseGmailMessage = (message) => {
    const subject = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Subject');
    const rawFrom = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'From');
    const rawReplyTo = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Reply-To');
    const rawTo = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'To');
    const rawDeliveredTo = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Delivered-To');
    const rawCc = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Cc');
    const rawBcc = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Bcc');
    const messageId = (0, get_property_from_headers_util_1.getPropertyFromHeaders)(message, 'Message-ID');
    const id = message.id;
    const threadId = message.threadId;
    const historyId = message.historyId;
    const internalDate = message.internalDate;
    const labelIds = message.labelIds ?? [];
    const messageHeaders = (message.payload?.headers ?? []).flatMap(({ name, value }) => (0, utils_1.isDefined)(name) && (0, utils_1.isDefined)(value) ? [{ name, value }] : []);
    (0, assert_1.default)(id, 'ID is missing');
    (0, assert_1.default)(historyId, 'History-ID is missing');
    (0, assert_1.default)(internalDate, 'Internal date is missing');
    const bodyResult = (0, get_body_data_util_1.getBodyData)(message);
    const decodedBody = bodyResult
        ? Buffer.from(bodyResult.data, 'base64').toString()
        : '';
    const isHtml = bodyResult?.isHtml ?? false;
    const attachments = (0, get_attachment_data_util_1.getAttachmentData)(message);
    return {
        id,
        headerMessageId: messageId,
        threadId,
        historyId,
        internalDate,
        subject,
        from: rawFrom ? (0, safe_parse_email_addresses_util_1.safeParseEmailAddresses)(rawFrom)[0] : undefined,
        replyTo: rawReplyTo ? (0, safe_parse_email_addresses_util_1.safeParseEmailAddresses)(rawReplyTo) : [],
        deliveredTo: rawDeliveredTo
            ? (0, safe_parse_email_address_address_util_1.safeParseEmailAddressAddress)(rawDeliveredTo)
            : undefined,
        to: rawTo ? (0, safe_parse_email_addresses_util_1.safeParseEmailAddresses)(rawTo) : [],
        cc: rawCc ? (0, safe_parse_email_addresses_util_1.safeParseEmailAddresses)(rawCc) : [],
        bcc: rawBcc ? (0, safe_parse_email_addresses_util_1.safeParseEmailAddresses)(rawBcc) : [],
        body: decodedBody,
        isHtml,
        attachments,
        labelIds,
        messageHeaders,
    };
};
exports.parseGmailMessage = parseGmailMessage;
