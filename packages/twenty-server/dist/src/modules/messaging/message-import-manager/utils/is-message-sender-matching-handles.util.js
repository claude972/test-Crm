"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMessageSenderMatchingHandles = void 0;
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const isMessageSenderMatchingHandles = (message, userHandles) => {
    const fromParticipant = message.participants?.find((participant) => participant.role === types_1.MessageParticipantRole.FROM);
    if (!(0, utils_1.isDefined)(fromParticipant?.handle)) {
        return false;
    }
    const normalizedUserHandles = userHandles.map((handle) => handle.toLowerCase());
    return normalizedUserHandles.includes(fromParticipant.handle.toLowerCase());
};
exports.isMessageSenderMatchingHandles = isMessageSenderMatchingHandles;
