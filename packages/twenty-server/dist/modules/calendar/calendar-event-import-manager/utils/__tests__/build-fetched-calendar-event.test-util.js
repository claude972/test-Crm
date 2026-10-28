"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFetchedCalendarEvent = buildFetchedCalendarEvent;
function buildFetchedCalendarEvent(overrides = {}) {
    return {
        id: 'test-event',
        summary: 'Test Event',
        start: '2024-12-01',
        end: '2024-12-01',
        ...overrides
    };
}
