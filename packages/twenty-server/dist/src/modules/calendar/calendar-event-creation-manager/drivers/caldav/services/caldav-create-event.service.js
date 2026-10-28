"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalDavCreateEventService = void 0;
const common_1 = require("@nestjs/common");
const ical_generator_1 = __importDefault(require("ical-generator"));
const uuid_1 = require("uuid");
const calendar_event_creation_exception_1 = require("src/modules/calendar/calendar-event-creation-manager/exceptions/calendar-event-creation.exception");
const caldav_client_provider_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/providers/caldav-client.provider");
const caldav_fetch_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-fetch-events.service");
const calendar_event_participant_workspace_entity_1 = require("src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity");
let CalDavCreateEventService = class CalDavCreateEventService {
    calDavClientProvider;
    calDavFetchEventsService;
    constructor(calDavClientProvider, calDavFetchEventsService) {
        this.calDavClientProvider = calDavClientProvider;
        this.calDavFetchEventsService = calDavFetchEventsService;
    }
    async createCalendarEvent(input, connectedAccount) {
        try {
            const client = await this.calDavClientProvider.getClient(connectedAccount.id);
            const [targetCalendar] = await this.calDavFetchEventsService.listEventCalendars(client);
            if (!targetCalendar) {
                throw new calendar_event_creation_exception_1.CalendarEventCreationException('No writable CalDAV calendar found', calendar_event_creation_exception_1.CalendarEventCreationExceptionCode.PROVIDER_REQUEST_FAILED);
            }
            const uid = (0, uuid_1.v4)();
            const calendar = (0, ical_generator_1.default)({ prodId: '//KovaaLabCRM//Calendar//EN' });
            calendar.createEvent({
                id: uid,
                start: new Date(input.startsAt),
                end: new Date(input.endsAt),
                allDay: input.isFullDay,
                summary: input.title,
                description: input.description,
                location: input.location,
                attendees: input.attendees.map((attendee) => ({
                    email: attendee.email,
                    name: attendee.displayName,
                })),
            });
            const filename = `${uid}.ics`;
            await client.createCalendarObject({
                calendar: targetCalendar,
                filename,
                iCalString: calendar.toString(),
            });
            // Source the resource href from the server through the same path the
            // import keys on, so a later sync reconciles this event instead of
            // duplicating it. Reconstructing the href locally risks a format mismatch
            // (full URL vs the server-relative path the provider returns).
            const reconstructedHref = new URL(filename, targetCalendar.url).href;
            let id = reconstructedHref;
            try {
                const [syncedEvent] = await this.calDavFetchEventsService.fetchEventsByHrefs(client, [
                    reconstructedHref,
                ]);
                id = syncedEvent?.id ?? reconstructedHref;
            }
            catch {
                // The event was created; resolving its server href is best-effort, so
                // fall back to the reconstructed href rather than failing the create.
            }
            const now = new Date().toISOString();
            return {
                id,
                iCalUid: uid,
                title: input.title,
                description: input.description ?? '',
                location: input.location ?? '',
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                isFullDay: input.isFullDay,
                isCanceled: false,
                isPrivate: false,
                status: 'CONFIRMED',
                organizerHandle: '',
                conferenceLinkLabel: '',
                conferenceLinkUrl: '',
                conferenceSolution: '',
                externalCreatedAt: now,
                externalUpdatedAt: now,
                participants: input.attendees.map((attendee) => ({
                    displayName: attendee.displayName ?? '',
                    handle: attendee.email,
                    responseStatus: calendar_event_participant_workspace_entity_1.CalendarEventParticipantResponseStatus.NEEDS_ACTION,
                    isOrganizer: false,
                })),
            };
        }
        catch (error) {
            if (error instanceof calendar_event_creation_exception_1.CalendarEventCreationException) {
                throw error;
            }
            throw new calendar_event_creation_exception_1.CalendarEventCreationException(`Failed to create CalDAV calendar event: ${error instanceof Error ? error.message : 'unknown error'}`, calendar_event_creation_exception_1.CalendarEventCreationExceptionCode.PROVIDER_REQUEST_FAILED);
        }
    }
};
exports.CalDavCreateEventService = CalDavCreateEventService;
exports.CalDavCreateEventService = CalDavCreateEventService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [caldav_client_provider_1.CalDavClientProvider,
        caldav_fetch_events_service_1.CalDavFetchEventsService])
], CalDavCreateEventService);
