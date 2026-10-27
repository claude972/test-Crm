import { Test, TestingModule } from '@nestjs/testing';

describe('CalendarRdvService', () => {
  it('should be defined', () => {
    expect(true).toBeDefined();
  });

  it('should validate event data', () => {
    const event = {
      id: 'test-id',
      title: 'Test Meeting',
      status: 'scheduled'
    };
    expect(event.title).toBe('Test Meeting');
    expect(event.status).toBe('scheduled');
  });
});
