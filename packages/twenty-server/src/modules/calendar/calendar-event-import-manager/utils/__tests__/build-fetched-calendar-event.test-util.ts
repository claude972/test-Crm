export function buildFetchedCalendarEvent(overrides: any = {}): any {
  return {
    id: 'test-event',
    summary: 'Test Event',
    start: '2024-12-01',
    end: '2024-12-01',
    ...overrides
  };
}
