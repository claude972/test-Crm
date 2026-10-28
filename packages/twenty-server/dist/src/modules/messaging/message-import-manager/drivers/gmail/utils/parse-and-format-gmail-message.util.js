"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndFormatGmailMessage = void 0;
const types_1 = require("kovaa-lab-shared/types");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const compute_message_direction_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-message-direction.util");
const parse_gmail_message_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/parse-gmail-message.util");
const build_reply_to_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/build-reply-to-participants.util");
const extract_message_text_without_quoted_history_util_1 = require("src/modules/messaging/message-import-manager/utils/extract-message-text-without-quoted-history.util");
const format_address_object_as_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/format-address-object-as-participants.util");
const parseAndFormatGmailMessage = (message, connectedAccount) => {
    const { id, threadId, internalDate, subject, from, replyTo, to, cc, bcc, headerMessageId, body, isHtml, attachments, deliveredTo, labelIds, messageHeaders, } = (0, parse_gmail_message_util_1.parseGmailMessage)(message);
    const isDraft = (labelIds ?? []).includes('DRAFT');
    // Gmail may omit the Message-ID header on drafts; synthesize a stable id from
    // the message id so drafts aren't dropped.
    const resolvedHeaderMessageId = headerMessageId ?? (isDraft ? `draft-${id}` : undefined);
    if (!(0, utils_1.isDefined)(from) ||
        !(0, utils_1.isDefined)(resolvedHeaderMessageId) ||
        !(0, utils_1.isDefined)(threadId)) {
        return null;
    }
    const toParticipants = (0, utils_1.isNonEmptyArray)(to)
        ? to
        : (0, guards_1.isNonEmptyString)(deliveredTo)
            ? [{ address: deliveredTo }]
            : [];
    const participants = [
        ...(0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)([from], types_1.MessageParticipantRole.FROM),
        ...(0, build_reply_to_participants_util_1.buildReplyToParticipants)(replyTo, from),
        ...(0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(toParticipants, types_1.MessageParticipantRole.TO),
        ...(0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(cc, types_1.MessageParticipantRole.CC),
        ...(0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(bcc, types_1.MessageParticipantRole.BCC),
    ];
    const hasRecipientParticipant = participants.some((participant) => participant.role !== types_1.MessageParticipantRole.FROM);
    if (!hasRecipientParticipant && !isDraft) {
        return null;
    }
    return {
        externalId: id,
        headerMessageId: resolvedHeaderMessageId,
        subject: subject || '',
        messageThreadExternalId: threadId,
        receivedAt: new Date(parseInt(internalDate)),
        direction: (0, compute_message_direction_util_1.computeMessageDirection)(from.address || '', connectedAccount),
        participants,
        text: (0, extract_message_text_without_quoted_history_util_1.extractMessageTextWithoutQuotedHistory)(isHtml ? { html: body } : { text: body }),
        attachments,
        messageFolderExternalIds: labelIds,
        labelIds,
        isDraft,
        messageHeaders,
    };
};
exports.parseAndFormatGmailMessage = parseAndFormatGmailMessage;
