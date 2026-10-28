"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const build_reply_to_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/build-reply-to-participants.util");
describe('buildReplyToParticipants', () => {
    it('exposes every Reply-To address as a REPLY_TO participant so relayed messages link to the real contacts', () => {
        const participants = (0, build_reply_to_participants_util_1.buildReplyToParticipants)([
            { address: 'jane@acme.com', name: 'Jane' },
            { address: 'sales@acme.com' },
        ], { address: 'wordpress@forms.example', name: 'Contact form' });
        expect(participants).toEqual([
            {
                role: types_1.MessageParticipantRole.REPLY_TO,
                handle: 'jane@acme.com',
                displayName: 'Jane',
            },
            {
                role: types_1.MessageParticipantRole.REPLY_TO,
                handle: 'sales@acme.com',
                displayName: '',
            },
        ]);
    });
    it('skips the Reply-To entry that merely echoes the sender, regardless of casing', () => {
        const participants = (0, build_reply_to_participants_util_1.buildReplyToParticipants)([{ address: 'WordPress@Forms.Example' }, { address: 'jane@acme.com' }], { address: 'wordpress@forms.example' });
        expect(participants).toEqual([
            {
                role: types_1.MessageParticipantRole.REPLY_TO,
                handle: 'jane@acme.com',
                displayName: '',
            },
        ]);
    });
});
