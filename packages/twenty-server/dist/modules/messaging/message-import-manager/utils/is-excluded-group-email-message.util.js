"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExcludedGroupEmailMessage = void 0;
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const is_bulk_mail_util_1 = require("src/modules/messaging/message-import-manager/utils/is-bulk-mail.util");
const is_group_email_1 = require("src/modules/messaging/message-import-manager/utils/is-group-email");
const is_message_sender_matching_handles_util_1 = require("src/modules/messaging/message-import-manager/utils/is-message-sender-matching-handles.util");
const isExcludedGroupEmailMessage = (message, userHandles) => {
    if ((0, is_message_sender_matching_handles_util_1.isMessageSenderMatchingHandles)(message, userHandles)) {
        return false;
    }
    if ((0, is_bulk_mail_util_1.isBulkMail)(message.messageHeaders ?? [])) {
        return true;
    }
    const senderHandle = message.participants?.find((participant) => participant.role === types_1.MessageParticipantRole.FROM)?.handle;
    if (!(0, utils_1.isDefined)(senderHandle)) {
        return false;
    }
    return (0, is_group_email_1.isGroupEmail)(senderHandle);
};
exports.isExcludedGroupEmailMessage = isExcludedGroupEmailMessage;
