"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
const calendar_event_participant_workspace_entity_1 = require("src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity");
let CalDavCreateEventService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalDavCreateEventService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalDavCreateEventService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return CalDavCreateEventService = _classThis;
})();
exports.CalDavCreateEventService = CalDavCreateEventService;
