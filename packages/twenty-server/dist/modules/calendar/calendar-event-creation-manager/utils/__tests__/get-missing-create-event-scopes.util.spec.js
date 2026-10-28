"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("kovaa-lab-shared/types");
const get_missing_create_event_scopes_util_1 = require("src/modules/calendar/calendar-event-creation-manager/utils/get-missing-create-event-scopes.util");
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const MICROSOFT_SCOPE = 'Calendars.ReadWrite';
describe('getMissingCreateEventScopes', () => {
    it('returns no missing scope when Google has calendar.events', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            scopes: ['email', GOOGLE_SCOPE],
        })).toEqual([]);
    });
    it('reports the Google calendar.events scope when missing', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            scopes: ['email'],
        })).toEqual([GOOGLE_SCOPE]);
    });
    it('returns no missing scope when Microsoft has Calendars.ReadWrite', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.MICROSOFT,
            scopes: [MICROSOFT_SCOPE],
        })).toEqual([]);
    });
    it('reports the Microsoft Calendars.ReadWrite scope when missing', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.MICROSOFT,
            scopes: ['Calendars.Read'],
        })).toEqual([MICROSOFT_SCOPE]);
    });
    it('treats null scopes as missing', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.GOOGLE,
            scopes: null,
        })).toEqual([GOOGLE_SCOPE]);
    });
    it('does not require OAuth scopes for non-OAuth providers', () => {
        expect((0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)({
            provider: types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV,
            scopes: null,
        })).toEqual([]);
    });
});
