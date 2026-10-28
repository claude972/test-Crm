"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const compute_calendar_event_sharing_key_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/compute-calendar-event-sharing-key.util");
describe('computeCalendarEventSharingKey', () => {
    it('keeps Google occurrences of one series apart even though they share an iCalUid', () => {
        expect((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            eventExternalId: 'series_20261012T090000Z',
            iCalUid: 'series@google.com',
        })).not.toEqual((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            eventExternalId: 'series_20261019T090000Z',
            iCalUid: 'series@google.com',
        }));
    });
    it('keeps Google events apart when only their calendar-scoped ids collide', () => {
        expect((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            eventExternalId: 'event-id',
            iCalUid: 'first-meeting@google.com',
        })).not.toEqual((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            eventExternalId: 'event-id',
            iCalUid: 'second-meeting@google.com',
        }));
    });
    it('matches Microsoft copies on the iCalUid since each mailbox has its own id', () => {
        expect((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.MICROSOFT,
            eventExternalId: 'mailbox-a-event-id',
            iCalUid: 'meeting-ical-uid',
        })).toEqual((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider: types_1.ConnectedAccountProvider.MICROSOFT,
            eventExternalId: 'mailbox-b-event-id',
            iCalUid: 'meeting-ical-uid',
        }));
    });
    it.each([
        { provider: types_1.ConnectedAccountProvider.GOOGLE, iCalUid: '' },
        { provider: types_1.ConnectedAccountProvider.MICROSOFT, iCalUid: null },
        {
            provider: types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV,
            iCalUid: 'meeting-ical-uid',
        },
    ])('never shares a $provider event with iCalUid "$iCalUid"', ({ provider, iCalUid }) => {
        expect((0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider,
            eventExternalId: 'event-id',
            iCalUid,
        })).toBeUndefined();
    });
});
