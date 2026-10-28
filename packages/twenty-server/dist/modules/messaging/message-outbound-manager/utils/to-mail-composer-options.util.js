"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMailComposerOptions = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const toMailComposerOptions = (from, sendMessageInput) => {
    return {
        from,
        to: sendMessageInput.to,
        cc: sendMessageInput.cc,
        bcc: sendMessageInput.bcc,
        subject: sendMessageInput.subject,
        text: sendMessageInput.body,
        html: sendMessageInput.html,
        newline: '\r\n',
        ...(sendMessageInput.attachments && sendMessageInput.attachments.length > 0
            ? {
                attachments: sendMessageInput.attachments.map((attachment) => ({
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                })),
            }
            : {}),
        ...(sendMessageInput.inReplyTo
            ? {
                inReplyTo: sendMessageInput.inReplyTo,
                references: (0, utils_1.isDefined)(sendMessageInput.references) &&
                    sendMessageInput.references.length > 0
                    ? sendMessageInput.references
                    : sendMessageInput.inReplyTo,
            }
            : {}),
    };
};
exports.toMailComposerOptions = toMailComposerOptions;
