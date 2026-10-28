"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingGetMessagesServiceGetMessages = void 0;
const types_1 = require("kovaa-lab-shared/types");
const message_direction_enum_1 = require("src/modules/messaging/common/enums/message-direction.enum");
exports.messagingGetMessagesServiceGetMessages = [
    {
        externalId: 'AA-work-emails-internal',
        subject: 'Test email for microsoft',
        receivedAt: new Date('2025-01-09T09:54:37.000Z'),
        text: 'Just a test',
        headerMessageId: '<d45b9f1c@PR0P264MB2911.FRAP264.PROD.OUTLOOK.COM>',
        messageThreadExternalId: 'AAQkAGZlMDQ1NjU5Lk=',
        direction: message_direction_enum_1.MessageDirection.OUTGOING,
        participants: [
            {
                role: types_1.MessageParticipantRole.FROM,
                handle: 'from@acme.com',
                displayName: 'From',
            },
            {
                role: types_1.MessageParticipantRole.TO,
                handle: 'to@acme.com',
                displayName: 'To',
            },
        ],
        attachments: [],
        isDraft: false,
    },
    {
        externalId: 'AA-work-emails-external',
        subject: 'Test email for microsoft',
        receivedAt: new Date('2025-01-09T09:54:37.000Z'),
        text: 'Just a test',
        headerMessageId: '<d45b9f1c@PR0P264MB2911.FRAP264.PROD.OUTLOOK.COM>',
        messageThreadExternalId: 'AAQkAGZlMDQ1NjU5Lk=',
        direction: message_direction_enum_1.MessageDirection.OUTGOING,
        participants: [
            {
                role: types_1.MessageParticipantRole.FROM,
                handle: 'from@acme.com',
                displayName: 'From',
            },
            {
                role: types_1.MessageParticipantRole.TO,
                handle: 'to@external.com',
                displayName: 'To',
            },
        ],
        attachments: [],
        isDraft: false,
    },
    {
        externalId: 'AA-personal-emails',
        subject: 'Sign in to your Microsoft Learn account for more features',
        receivedAt: new Date('2025-01-28T19:01:21.000Z'),
        text: 'Learn with interactive sandboxes, curated collections, and bookmarks',
        headerMessageId: '<AC70000@mails.microsoft.com>',
        messageThreadExternalId: 'AAQkAGZlMDQ1NNc=',
        direction: message_direction_enum_1.MessageDirection.INCOMING,
        participants: [
            {
                role: types_1.MessageParticipantRole.FROM,
                handle: 'learn@mails.microsoft.com',
                displayName: 'Microsoft Learn',
            },
            {
                role: types_1.MessageParticipantRole.TO,
                handle: 'to@gmail.com',
                displayName: 'To',
            },
        ],
        attachments: [],
        isDraft: false,
    },
];
