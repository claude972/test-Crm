"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const availability_entity_1 = require("../../calendar/common/standard-objects/availability.entity");
describe('Calendar Availability', () => {
    it('should create availability entity', () => {
        const entity = new availability_entity_1.AvailabilityEntity({});
        expect(entity).toBeDefined();
        expect(entity.type).toBeUndefined();
        expect(entity.memberId).toBeUndefined();
    });
});
