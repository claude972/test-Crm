/** @jest-environment node */
import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityEntity } from '../../calendar/common/standard-objects/availability.entity';

describe('Calendar Availability', () => {
  it('should create availability entity', () => {
    const entity = new AvailabilityEntity({});
    expect(entity).toBeDefined();
    expect(entity.type).toBeUndefined();
    expect(entity.memberId).toBeUndefined();
  });
});
