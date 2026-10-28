"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const format_address_object_as_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/format-address-object-as-participants.util");
describe('formatAddressObjectAsParticipants', () => {
    it('should format address object as participants', () => {
        const addresses = [
            { name: 'John Doe', address: 'john.doe @example.com' },
            { name: 'Jane Smith', address: 'jane.smith@example.com ' },
        ];
        const result = (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(addresses, types_1.MessageParticipantRole.FROM);
        expect(result).toEqual([
            {
                role: types_1.MessageParticipantRole.FROM,
                handle: 'john.doe@example.com',
                displayName: 'John Doe',
            },
            {
                role: types_1.MessageParticipantRole.FROM,
                handle: 'jane.smith@example.com',
                displayName: 'Jane Smith',
            },
        ]);
    });
    it('should return an empty array if address object handle has no @', () => {
        const addressObject = {
            name: 'John Doe',
            address: 'john.doe',
        };
        const result = (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)([addressObject], types_1.MessageParticipantRole.TO);
        expect(result).toEqual([]);
    });
    it('should return an empty array if address object handle is empty', () => {
        const addressObject = {
            name: 'John Doe',
            address: '',
        };
        const result = (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)([addressObject], types_1.MessageParticipantRole.TO);
        expect(result).toEqual([]);
    });
    it('should return a lowewrcase handle if the handle is not lowercase', () => {
        const addressObject = {
            name: 'John Doe',
            address: 'John.Doe@example.com',
        };
        const result = (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)([addressObject], types_1.MessageParticipantRole.TO);
        expect(result).toEqual([
            {
                role: types_1.MessageParticipantRole.TO,
                handle: 'john.doe@example.com',
                displayName: 'John Doe',
            },
        ]);
    });
});
