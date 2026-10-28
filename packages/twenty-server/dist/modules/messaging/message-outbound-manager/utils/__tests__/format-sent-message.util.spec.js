"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const message_direction_enum_1 = require("src/modules/messaging/common/enums/message-direction.enum");
const format_sent_message_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-sent-message.util");
const buildInput = (overrides = {}) => ({
    sendResult: {
        headerMessageId: '<msg-1@mail.example>',
        messageExternalId: 'gmail-external-1',
        threadExternalId: 'thread-external-1',
    },
    subject: 'Quarterly review',
    body: 'See attached.',
    recipients: { to: [], cc: [], bcc: [] },
    connectedAccount: {
        handle: 'sender@example.com',
    },
    messageChannelId: 'channel-1',
    workspaceId: 'workspace-1',
    ...overrides,
});
describe('formatSentMessage', () => {
    it('should mark the message as OUTGOING with the sender as FROM participant', () => {
        const message = (0, format_sent_message_util_1.formatSentMessage)(buildInput());
        expect(message.direction).toBe(message_direction_enum_1.MessageDirection.OUTGOING);
        expect(message.participants).toContainEqual({
            role: types_1.MessageParticipantRole.FROM,
            handle: 'sender@example.com',
            displayName: 'sender@example.com',
        });
    });
    it('should emit one participant per to/cc/bcc recipient with correct roles', () => {
        const message = (0, format_sent_message_util_1.formatSentMessage)(buildInput({
            recipients: {
                to: ['alice@example.com'],
                cc: ['bob@example.com', 'carol@example.com'],
                bcc: ['dave@example.com'],
            },
        }));
        const rolesByHandle = Object.fromEntries(message.participants.map((participant) => [
            participant.handle,
            participant.role,
        ]));
        expect(rolesByHandle).toEqual({
            'sender@example.com': types_1.MessageParticipantRole.FROM,
            'alice@example.com': types_1.MessageParticipantRole.TO,
            'bob@example.com': types_1.MessageParticipantRole.CC,
            'carol@example.com': types_1.MessageParticipantRole.CC,
            'dave@example.com': types_1.MessageParticipantRole.BCC,
        });
    });
    it('should fall back to the headerMessageId when the provider omits external ids so unrelated sends do not collide on a shared empty thread key', () => {
        const message = (0, format_sent_message_util_1.formatSentMessage)(buildInput({
            sendResult: {
                headerMessageId: '<msg-2@mail.example>',
                messageExternalId: undefined,
                threadExternalId: undefined,
            },
        }));
        expect(message.externalId).toBe('<msg-2@mail.example>');
        expect(message.messageThreadExternalId).toBe('<msg-2@mail.example>');
        expect(message.headerMessageId).toBe('<msg-2@mail.example>');
    });
    it('should persist IMAP/SMTP replies under the parent thread external id rather than the immediate parent Message-ID', () => {
        const message = (0, format_sent_message_util_1.formatSentMessage)(buildInput({
            sendResult: {
                headerMessageId: '<reply@mail.example>',
                messageExternalId: undefined,
                threadExternalId: undefined,
            },
            inReplyTo: '<parent@mail.example>',
            parentThreadExternalId: '<root@mail.example>',
        }));
        expect(message.messageThreadExternalId).toBe('<root@mail.example>');
    });
    it('should copy subject and body verbatim and start with no folder associations', () => {
        const message = (0, format_sent_message_util_1.formatSentMessage)(buildInput());
        expect(message.subject).toBe('Quarterly review');
        expect(message.text).toBe('See attached.');
        expect(message.attachments).toEqual([]);
        expect(message.messageFolderIds).toBeUndefined();
    });
});
