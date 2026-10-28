"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CalDavFetchEventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalDavFetchEventsService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const tsdav_1 = require("tsdav");
const utils_1 = require("kovaa-lab-shared/utils");
const caldav_unversioned_resource_constant_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/constants/caldav-unversioned-resource.constant");
const extract_ical_data_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/extract-ical-data.util");
const is_caldav_collection_href_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-caldav-collection-href.util");
const is_event_calendar_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-event-calendar.util");
const is_event_in_time_range_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-event-in-time-range.util");
const is_invalid_sync_token_response_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-invalid-sync-token-response.util");
const is_same_caldav_resource_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-same-caldav-resource.util");
const is_valid_caldav_href_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/is-valid-caldav-href.util");
const map_caldav_status_to_exception_code_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/map-caldav-status-to-exception-code.util");
const parse_ical_event_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/parse-ical-event.util");
const resolve_caldav_resource_version_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/resolve-caldav-resource-version.util");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
let CalDavFetchEventsService = class CalDavFetchEventsService {
    static { CalDavFetchEventsService_1 = this; }
    logger = new common_1.Logger(CalDavFetchEventsService_1.name);
    static PAST_DAYS_WINDOW = 365 * 5;
    static FUTURE_DAYS_WINDOW = 365;
    async listEventCalendars(client) {
        const calendars = await client.fetchCalendars();
        return calendars.filter(is_event_calendar_util_1.isEventCalendar);
    }
    async fetchChangedEventHrefs(client, syncCursor) {
        const calendars = await this.listEventCalendars(client);
        const results = await Promise.all(calendars.map((calendar) => this.syncCalendar(client, calendar, syncCursor)));
        return {
            changedHrefs: results.flatMap((result) => result.changedHrefs),
            cancelledHrefs: results.flatMap((result) => result.cancelledHrefs),
            syncCursor: this.mergeSyncCursor(results),
        };
    }
    async fetchEventsByHrefs(client, eventHrefs) {
        if (eventHrefs.length === 0)
            return [];
        const startDate = new Date(Date.now() -
            CalDavFetchEventsService_1.PAST_DAYS_WINDOW * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() +
            CalDavFetchEventsService_1.FUTURE_DAYS_WINDOW * 24 * 60 * 60 * 1000);
        const collectionUrls = [
            ...new Set(eventHrefs.map((href) => this.resolveCollectionUrl(client, href))),
        ];
        const calendarObjects = (await Promise.all(collectionUrls.map((collectionUrl) => this.fetchCalendarObjects(client, collectionUrl, eventHrefs.filter((href) => this.resolveCollectionUrl(client, href) === collectionUrl))))).flat();
        return calendarObjects.flatMap((calendarObject) => {
            const iCalData = (0, extract_ical_data_util_1.extractICalData)(calendarObject.props?.calendarData);
            if (!(0, guards_1.isNonEmptyString)(calendarObject.href) || !iCalData)
                return [];
            return (0, parse_ical_event_util_1.parseICalEvents)(iCalData, calendarObject.href).filter((event) => (0, is_event_in_time_range_util_1.isEventInTimeRange)(event, startDate, endDate));
        });
    }
    async fetchCalendarObjects(client, collectionUrl, objectUrls) {
        const responses = await client.davRequest({
            url: collectionUrl,
            init: {
                method: 'REPORT',
                namespace: tsdav_1.DAVNamespaceShort.CALDAV,
                headers: { depth: '1' },
                body: {
                    'calendar-multiget': {
                        _attributes: (0, tsdav_1.getDAVAttribute)([
                            tsdav_1.DAVNamespace.DAV,
                            tsdav_1.DAVNamespace.CALDAV,
                        ]),
                        [`${tsdav_1.DAVNamespaceShort.DAV}:prop`]: {
                            [`${tsdav_1.DAVNamespaceShort.DAV}:getetag`]: {},
                            [`${tsdav_1.DAVNamespaceShort.CALDAV}:calendar-data`]: {},
                        },
                        [`${tsdav_1.DAVNamespaceShort.DAV}:href`]: objectUrls,
                    },
                },
            },
        });
        const unreadableResponses = responses.filter((response) => (0, utils_1.isDefined)(response.status) && response.status >= 400);
        const failedRequest = unreadableResponses.find((response) => !(0, guards_1.isNonEmptyString)(response.href) ||
            (0, is_same_caldav_resource_util_1.isSameCalDavResource)(response.href, collectionUrl));
        if ((0, utils_1.isDefined)(failedRequest)) {
            throw new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(`calendar-multiget on ${collectionUrl} failed: ${failedRequest.status} ${failedRequest.statusText}`, (0, map_caldav_status_to_exception_code_util_1.mapCalDavStatusToExceptionCode)(failedRequest.status));
        }
        const removedResponses = unreadableResponses.filter((response) => response.status === 404 || response.status === 410);
        const unexpectedResponses = unreadableResponses.filter((response) => response.status !== 404 && response.status !== 410);
        if (removedResponses.length > 0) {
            this.logger.debug(`Skipping ${removedResponses.length} calendar events removed from ${collectionUrl} since the last list fetch`);
        }
        if (unexpectedResponses.length > 0) {
            this.logger.warn(`Skipping ${unexpectedResponses.length} unreadable calendar events in ${collectionUrl}: ${unexpectedResponses
                .map((response) => `${response.href} ${response.status}`)
                .join(', ')}`);
        }
        return responses.filter((response) => !(0, utils_1.isDefined)(response.status) || response.status < 400);
    }
    resolveCollectionUrl(client, href) {
        const collectionPath = href.slice(0, href.lastIndexOf('/') + 1);
        return new URL(collectionPath, client.serverUrl).href;
    }
    async syncCalendar(client, calendar, syncCursor) {
        const supportsSyncCollection = calendar.reports?.includes('syncCollection') ?? false;
        try {
            return supportsSyncCollection
                ? await this.fetchHrefsViaSyncCollection(client, calendar, syncCursor)
                : await this.fetchHrefsViaCtagEtag(client, calendar, syncCursor);
        }
        catch (error) {
            this.logger.error(`Per-calendar sync failed for ${calendar.url}`, error);
            return {
                calendarUrl: calendar.url,
                changedHrefs: [],
                cancelledHrefs: [],
                newSyncToken: syncCursor?.syncTokens[calendar.url],
                newCtag: syncCursor?.ctags?.[calendar.url],
                newEtags: syncCursor?.etags?.[calendar.url],
            };
        }
    }
    async fetchHrefsViaSyncCollection(client, calendar, syncCursor) {
        const previousSyncToken = syncCursor?.syncTokens[calendar.url];
        const syncResult = await this.runSyncCollection(client, calendar.url, previousSyncToken);
        const memberResponses = syncResult.filter((entry) => (0, guards_1.isNonEmptyString)(entry.href) &&
            (0, is_valid_caldav_href_util_1.isValidCalDavHref)(entry.href) &&
            !(0, is_caldav_collection_href_util_1.isCalDavCollectionHref)(entry.href, calendar.url));
        const changedHrefs = memberResponses
            .filter((entry) => entry.status !== 404)
            .map((entry) => entry.href);
        const cancelledHrefs = memberResponses
            .filter((entry) => entry.status === 404)
            .map((entry) => entry.href);
        const rawSyncToken = syncResult[0]?.raw?.multistatus?.syncToken;
        const newSyncToken = (0, utils_1.isDefined)(rawSyncToken)
            ? String(rawSyncToken)
            : previousSyncToken;
        return {
            calendarUrl: calendar.url,
            changedHrefs,
            cancelledHrefs,
            newSyncToken,
        };
    }
    async runSyncCollection(client, url, previousSyncToken) {
        const send = (token) => client.syncCollection({
            url,
            props: {
                [`${tsdav_1.DAVNamespaceShort.DAV}:getetag`]: {},
                [`${tsdav_1.DAVNamespaceShort.CALDAV}:calendar-data`]: {},
            },
            syncLevel: 1,
            ...((0, guards_1.isNonEmptyString)(token) ? { syncToken: token } : {}),
        });
        const result = await send(previousSyncToken);
        if ((0, guards_1.isNonEmptyString)(previousSyncToken) &&
            (0, is_invalid_sync_token_response_util_1.isInvalidSyncTokenResponse)(result)) {
            this.logger.warn(`Sync-token invalidated for ${url}; falling back to full re-sync`);
            return send(undefined);
        }
        return result;
    }
    async fetchHrefsViaCtagEtag(client, calendar, syncCursor) {
        const storedEtags = syncCursor?.etags?.[calendar.url] ?? {};
        const newCtag = (0, utils_1.isDefined)(calendar.ctag)
            ? String(calendar.ctag)
            : undefined;
        const storedCtag = syncCursor?.ctags?.[calendar.url];
        if ((0, utils_1.isDefined)(newCtag) && (0, utils_1.isDefined)(storedCtag) && newCtag === storedCtag) {
            return {
                calendarUrl: calendar.url,
                changedHrefs: [],
                cancelledHrefs: [],
                newCtag,
                newEtags: storedEtags,
            };
        }
        const currentEtags = await this.fetchEtagsByHref(client, calendar.url);
        const changedHrefs = Object.keys(currentEtags).filter((href) => currentEtags[href] === caldav_unversioned_resource_constant_1.CALDAV_UNVERSIONED_RESOURCE ||
            storedEtags[href] !== currentEtags[href]);
        const cancelledHrefs = Object.keys(storedEtags).filter((href) => !(href in currentEtags) && !(0, is_caldav_collection_href_util_1.isCalDavCollectionHref)(href, calendar.url));
        const listedResources = Object.keys(currentEtags).length > 0;
        return {
            calendarUrl: calendar.url,
            changedHrefs,
            cancelledHrefs,
            newCtag: listedResources ? newCtag : undefined,
            newEtags: currentEtags,
        };
    }
    mergeSyncCursor(results) {
        const syncTokens = {};
        const ctags = {};
        const etags = {};
        for (const result of results) {
            if (result.newSyncToken)
                syncTokens[result.calendarUrl] = result.newSyncToken;
            if (result.newCtag)
                ctags[result.calendarUrl] = result.newCtag;
            if (result.newEtags)
                etags[result.calendarUrl] = result.newEtags;
        }
        return {
            syncTokens,
            ctags: Object.keys(ctags).length > 0 ? ctags : undefined,
            etags: Object.keys(etags).length > 0 ? etags : undefined,
        };
    }
    async fetchEtagsByHref(client, calendarUrl) {
        const responses = await client.propfind({
            url: calendarUrl,
            props: {
                [`${tsdav_1.DAVNamespaceShort.DAV}:getetag`]: {},
                [`${tsdav_1.DAVNamespaceShort.DAV}:getlastmodified`]: {},
            },
            depth: '1',
        });
        const memberResponses = responses.filter((response) => (0, guards_1.isNonEmptyString)(response.href) &&
            !(0, is_caldav_collection_href_util_1.isCalDavCollectionHref)(response.href, calendarUrl));
        return memberResponses.reduce((map, response) => {
            if (!(0, is_valid_caldav_href_util_1.isValidCalDavHref)(response.href)) {
                return map;
            }
            map[response.href] = (0, resolve_caldav_resource_version_util_1.resolveCalDavResourceVersion)(response);
            return map;
        }, {});
    }
};
exports.CalDavFetchEventsService = CalDavFetchEventsService;
exports.CalDavFetchEventsService = CalDavFetchEventsService = CalDavFetchEventsService_1 = __decorate([
    (0, common_1.Injectable)()
], CalDavFetchEventsService);
