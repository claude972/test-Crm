export function computeCalendarEventSharingKey(eventId: string): string {
  return `key-${eventId}`;
}
