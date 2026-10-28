"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectedAccountSendableHandleOrThrow = void 0;
const macro_1 = require("@lingui/core/macro");
const utils_1 = require("kovaa-lab-shared/utils");
const message_channel_exception_1 = require("src/engine/metadata-modules/message-channel/message-channel.exception");
const getConnectedAccountSendableHandleOrThrow = ({ connectedAccount, requestedFromHandle, }) => {
    const normalizedRequestedFromHandle = requestedFromHandle
        .trim()
        .toLowerCase();
    const matchedFromHandle = (0, utils_1.getSendableEmailHandles)(connectedAccount).find((sendableHandle) => sendableHandle.trim().toLowerCase() === normalizedRequestedFromHandle);
    if (!(0, utils_1.isDefined)(matchedFromHandle)) {
        throw new message_channel_exception_1.MessageChannelException(`Sender ${requestedFromHandle} is not the connected account handle nor one of its verified aliases`, message_channel_exception_1.MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT, {
            userFriendlyMessage: (0, macro_1.msg) `You cannot send from this address.`,
        });
    }
    return matchedFromHandle;
};
exports.getConnectedAccountSendableHandleOrThrow = getConnectedAccountSendableHandleOrThrow;
