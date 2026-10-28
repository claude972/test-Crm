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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventComposerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const macro_1 = require("@lingui/core/macro");
const guards_1 = require("@sniptt/guards");
const constants_1 = require("kovaa-lab-shared/constants");
const utils_1 = require("kovaa-lab-shared/utils");
const zod_1 = require("zod");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const get_missing_create_event_scopes_util_1 = require("src/modules/calendar/calendar-event-creation-manager/utils/get-missing-create-event-scopes.util");
const is_calendar_creation_supported_provider_util_1 = require("src/modules/calendar/calendar-event-creation-manager/utils/is-calendar-creation-supported-provider.util");
const is_valid_time_zone_util_1 = require("src/modules/calendar/calendar-event-creation-manager/utils/is-valid-time-zone.util");
const resolve_calendar_event_time_zone_util_1 = require("src/modules/calendar/calendar-event-creation-manager/utils/resolve-calendar-event-time-zone.util");
// Timed events need an absolute instant, so the date-time must carry an explicit
// UTC offset (Z or ±hh:mm); without one the instant is ambiguous and providers
// would schedule it at the wrong time. All-day boundaries are calendar dates.
const offsetDateTimeSchema = zod_1.z.string().datetime({ offset: true });
const dateSchema = zod_1.z.string().date();
let CalendarEventComposerService = class CalendarEventComposerService {
    connectedAccountRepository;
    calendarChannelRepository;
    emailSchema = zod_1.z.string().trim().pipe(zod_1.z.email());
    constructor(connectedAccountRepository, calendarChannelRepository) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.calendarChannelRepository = calendarChannelRepository;
    }
    async composeCalendarEvent(params, workspaceId) {
        const normalizedInput = this.normalizeAndValidateInput(params);
        if ('error' in normalizedInput) {
            return { success: false, error: normalizedInput.error };
        }
        const resolution = await this.resolveCalendarAccount(params.connectedAccountId, workspaceId);
        if ('error' in resolution) {
            return { success: false, error: resolution.error };
        }
        const { connectedAccount, calendarChannel } = resolution;
        const missingScopes = (0, get_missing_create_event_scopes_util_1.getMissingCreateEventScopes)(connectedAccount);
        if (missingScopes.length > 0) {
            const missingScopeList = missingScopes.join(', ');
            return {
                success: false,
                error: (0, macro_1.msg) `The connected ${connectedAccount.provider} account is missing calendar permissions (${missingScopeList}). Please reconnect the account to grant calendar access.`,
            };
        }
        return {
            success: true,
            data: { input: normalizedInput, connectedAccount, calendarChannel },
        };
    }
    normalizeAndValidateInput(params) {
        const title = params.title?.trim();
        if (!(0, guards_1.isNonEmptyString)(title)) {
            return { error: (0, macro_1.msg) `A title is required to create a calendar event` };
        }
        const isFullDay = params.isFullDay ?? false;
        const datesError = this.validateDates(params.startsAt, params.endsAt, isFullDay);
        if ((0, utils_1.isDefined)(datesError)) {
            return { error: datesError };
        }
        const timeZone = (0, resolve_calendar_event_time_zone_util_1.resolveCalendarEventTimeZone)(params.timeZone);
        if (!(0, is_valid_time_zone_util_1.isValidTimeZone)(timeZone)) {
            return {
                error: (0, macro_1.msg) `timeZone "${timeZone}" is not a valid IANA time zone`,
            };
        }
        const sendInvitations = params.sendInvitations ?? false;
        // Attendees are only ever attached when the caller explicitly opts in to
        // notifying them, so creating an event never silently emails external people.
        const attendeeEmails = sendInvitations
            ? this.parseAttendeeEmails(params.attendees)
            : [];
        if (attendeeEmails.length > constants_1.MAX_EMAIL_RECIPIENTS) {
            const attendeeCount = attendeeEmails.length;
            return {
                error: (0, macro_1.msg) `Too many attendees: ${attendeeCount}. Maximum allowed is ${constants_1.MAX_EMAIL_RECIPIENTS}.`,
            };
        }
        const invalidAttendees = attendeeEmails.filter((email) => !this.emailSchema.safeParse(email).success);
        if (invalidAttendees.length > 0) {
            const invalidAttendeeList = invalidAttendees.join(', ');
            return {
                error: (0, macro_1.msg) `Invalid attendee email addresses: ${invalidAttendeeList}`,
            };
        }
        return {
            title,
            description: params.description,
            location: params.location,
            startsAt: params.startsAt,
            endsAt: params.endsAt,
            isFullDay,
            timeZone,
            attendees: attendeeEmails.map((email) => ({ email })),
            sendInvitations,
            addConferencing: params.addConferencing ?? false,
        };
    }
    // All-day boundaries collapse to a date, so they must be validated at day
    // granularity; timed boundaries are absolute instants and must carry an offset.
    validateDates(startsAt, endsAt, isFullDay) {
        if (isFullDay) {
            const startDate = startsAt.slice(0, 10);
            const endDate = endsAt.slice(0, 10);
            if (!dateSchema.safeParse(startDate).success ||
                !dateSchema.safeParse(endDate).success) {
                return (0, macro_1.msg) `startsAt and endsAt must be valid ISO 8601 dates`;
            }
            if (endDate <= startDate) {
                return (0, macro_1.msg) `endsAt must be a later day than startsAt for all-day events`;
            }
            return undefined;
        }
        if (!offsetDateTimeSchema.safeParse(startsAt).success ||
            !offsetDateTimeSchema.safeParse(endsAt).success) {
            return (0, macro_1.msg) `startsAt and endsAt must be ISO 8601 date-times with an offset (e.g. 2026-07-01T15:00:00Z)`;
        }
        if (Date.parse(endsAt) <= Date.parse(startsAt)) {
            return (0, macro_1.msg) `endsAt must be after startsAt`;
        }
        return undefined;
    }
    parseAttendeeEmails(attendees) {
        return (attendees ?? '')
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.length > 0);
    }
    async resolveCalendarAccount(connectedAccountId, workspaceId) {
        // A blank id (the workflow node's default) falls back to the default account.
        if ((0, guards_1.isNonEmptyString)(connectedAccountId)) {
            if (!(0, utils_1.isValidUuid)(connectedAccountId)) {
                return {
                    error: (0, macro_1.msg) `The provided connectedAccountId is not a valid UUID`,
                };
            }
            const connectedAccount = await this.connectedAccountRepository.findOne({
                where: { id: connectedAccountId, workspaceId },
            });
            if (!(0, utils_1.isDefined)(connectedAccount)) {
                return {
                    error: (0, macro_1.msg) `No connected account found for id "${connectedAccountId}"`,
                };
            }
            if (!(0, is_calendar_creation_supported_provider_util_1.isCalendarCreationSupportedProvider)(connectedAccount.provider)) {
                return {
                    error: (0, macro_1.msg) `Calendar event creation is only supported for Google, Microsoft and CalDAV accounts (got ${connectedAccount.provider})`,
                };
            }
            const calendarChannel = await this.findSyncEnabledCalendarChannel(connectedAccount.id, workspaceId);
            if (!(0, utils_1.isDefined)(calendarChannel)) {
                return {
                    error: (0, macro_1.msg) `Connected account "${connectedAccountId}" has no calendar channel with sync enabled. Enable calendar sync for this account first.`,
                };
            }
            return { connectedAccount, calendarChannel };
        }
        return this.resolveDefaultCalendarAccount(workspaceId);
    }
    // Only sync-enabled channels are eligible: a created event is reconciled by the
    // provider sync, which skips channels whose sync is disabled.
    async resolveDefaultCalendarAccount(workspaceId) {
        const calendarChannels = await this.calendarChannelRepository.find({
            where: { workspaceId, isSyncEnabled: true },
            relations: { connectedAccount: true },
            order: { createdAt: 'ASC' },
        });
        const calendarChannel = calendarChannels.find((channel) => (0, utils_1.isDefined)(channel.connectedAccount) &&
            !(0, utils_1.isDefined)(channel.connectedAccount.archivedAt) &&
            (0, is_calendar_creation_supported_provider_util_1.isCalendarCreationSupportedProvider)(channel.connectedAccount.provider));
        if (!(0, utils_1.isDefined)(calendarChannel)) {
            return {
                error: (0, macro_1.msg) `No Google, Microsoft or CalDAV account with calendar sync is connected in this workspace`,
            };
        }
        return {
            connectedAccount: calendarChannel.connectedAccount,
            calendarChannel,
        };
    }
    async findSyncEnabledCalendarChannel(connectedAccountId, workspaceId) {
        return this.calendarChannelRepository.findOne({
            where: { connectedAccountId, workspaceId, isSyncEnabled: true },
            order: { createdAt: 'ASC' },
        });
    }
};
exports.CalendarEventComposerService = CalendarEventComposerService;
exports.CalendarEventComposerService = CalendarEventComposerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [Function, Function])
], CalendarEventComposerService);
