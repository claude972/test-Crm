"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractParticipantsFromParsedEmail = void 0;
const types_1 = require("kovaa-lab-shared/types");
const build_reply_to_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/build-reply-to-participants.util");
const extract_addresses_from_parsed_email_util_1 = require("src/modules/messaging/message-import-manager/utils/extract-addresses-from-parsed-email.util");
const format_address_object_as_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/format-address-object-as-participants.util");
const extractParticipantsFromParsedEmail = (parsed) => {
    const addressFields = [
        { field: parsed.from, role: types_1.MessageParticipantRole.FROM },
        { field: parsed.to, role: types_1.MessageParticipantRole.TO },
        { field: parsed.cc, role: types_1.MessageParticipantRole.CC },
        { field: parsed.bcc, role: types_1.MessageParticipantRole.BCC },
    ];
    const from = (0, extract_addresses_from_parsed_email_util_1.extractAddressesFromParsedEmail)(parsed.from)[0];
    const replyTo = (0, extract_addresses_from_parsed_email_util_1.extractAddressesFromParsedEmail)(parsed.replyTo);
    return [
        ...addressFields.flatMap(({ field, role }) => (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)((0, extract_addresses_from_parsed_email_util_1.extractAddressesFromParsedEmail)(field), role)),
        ...(0, build_reply_to_participants_util_1.buildReplyToParticipants)(replyTo, from),
    ];
};
exports.extractParticipantsFromParsedEmail = extractParticipantsFromParsedEmail;
