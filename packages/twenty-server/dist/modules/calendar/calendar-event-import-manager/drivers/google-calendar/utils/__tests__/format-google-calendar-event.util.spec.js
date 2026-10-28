"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_google_calendar_event_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/format-google-calendar-event.util");
const calendar_event_participant_workspace_entity_1 = require("src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity");
describe('formatGoogleCalendarEvents', () => {
    const mockGoogleEvent = {
        id: 'event123',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Conference Room A',
        status: 'confirmed',
        created: '2023-01-01T10:00:00Z',
        updated: '2023-01-02T10:00:00Z',
        iCalUID: 'event123@google.com',
        start: {
            dateTime: '2023-01-15T14:00:00Z',
        },
        end: {
            dateTime: '2023-01-15T15:00:00Z',
        },
        attendees: [
            {
                email: 'organizer@example.com',
                displayName: 'Meeting Organizer',
                organizer: true,
                responseStatus: 'accepted',
            },
            {
                email: 'attendee@example.com',
                displayName: 'Test Attendee',
                responseStatus: 'tentative',
            },
        ],
        conferenceData: {
            conferenceSolution: {
                key: {
                    type: 'hangoutsMeet',
                },
            },
            entryPoints: [
                {
                    uri: 'https://meet.google.com/abc-defg-hij',
                },
            ],
        },
    };
    it('should lowercase attendee handles', () => {
        const [formattedEvent] = (0, format_google_calendar_event_util_1.formatGoogleCalendarEvents)([
            {
                ...mockGoogleEvent,
                attendees: [{ email: 'John.Doe@Example.com', displayName: 'John Doe' }],
            },
        ]);
        expect(formattedEvent.participants[0].handle).toBe('john.doe@example.com');
    });
    it('should correctly format a normal Google Calendar event', () => {
        const result = (0, format_google_calendar_event_util_1.formatGoogleCalendarEvents)([mockGoogleEvent]);
        expect(result).toHaveLength(1);
        const formattedEvent = result[0];
        expect(formattedEvent.title).toBe('Team Meeting');
        expect(formattedEvent.description).toBe('Weekly team sync');
        expect(formattedEvent.location).toBe('Conference Room A');
        expect(formattedEvent.isCanceled).toBe(false);
        expect(formattedEvent.isFullDay).toBe(false);
        expect(formattedEvent.startsAt).toBe('2023-01-15T14:00:00Z');
        expect(formattedEvent.endsAt).toBe('2023-01-15T15:00:00Z');
        expect(formattedEvent.id).toBe('event123');
        expect(formattedEvent.conferenceSolution).toBe('hangoutsMeet');
        expect(formattedEvent.conferenceLinkUrl).toBe('https://meet.google.com/abc-defg-hij');
        expect(formattedEvent.participants).toHaveLength(2);
        expect(formattedEvent.participants[0].handle).toBe('organizer@example.com');
        expect(formattedEvent.participants[0].isOrganizer).toBe(true);
        expect(formattedEvent.participants[0].responseStatus).toBe(calendar_event_participant_workspace_entity_1.CalendarEventParticipantResponseStatus.ACCEPTED);
        expect(formattedEvent.participants[1].handle).toBe('attendee@example.com');
        expect(formattedEvent.participants[1].responseStatus).toBe(calendar_event_participant_workspace_entity_1.CalendarEventParticipantResponseStatus.TENTATIVE);
    });
    const testCases = [
        {
            title: 'should sanitize a UCALID with \u0000',
            context: {
                input: '\u0000eventStrange@google.com',
                expected: 'eventStrange@google.com',
            },
        },
        {
            title: 'should sanitize a UCALID with \u0000',
            context: {
                input: '>\u0000\u0015-;_�^�W&�p\u001f�',
                expected: '>\u0015-;_�^�W&�p\u001f�',
            },
        },
        {
            title: 'should sanitize a UCALID with \x00',
            context: {
                input: '�\u0002��y�_΢�\u0013��\x00',
                expected: '�\u0002��y�_΢�\u0013��',
            },
        },
        {
            title: 'should sanitize a UCALID with del',
            context: {
                input: 'del�\u0002��y�_΢�\u0013��',
                expected: 'del�\u0002��y�_΢�\u0013��',
            },
        },
    ];
    it.each(testCases)('$title', ({ context }) => {
        const mockGoogleEventWithImproperUcalid = {
            ...mockGoogleEvent,
            iCalUID: context.input,
        };
        const result = (0, format_google_calendar_event_util_1.formatGoogleCalendarEvents)([
            mockGoogleEventWithImproperUcalid,
        ]);
        expect(result[0].iCalUid).toBe(context.expected);
    });
    it.each([
        [undefined, false],
        ['default', false],
        ['public', false],
        ['private', true],
        ['confidential', true],
    ])('should map visibility %s to isPrivate %s', (visibility, isPrivate) => {
        const [formattedEvent] = (0, format_google_calendar_event_util_1.formatGoogleCalendarEvents)([
            { ...mockGoogleEvent, visibility },
        ]);
        expect(formattedEvent.isPrivate).toBe(isPrivate);
    });
});
