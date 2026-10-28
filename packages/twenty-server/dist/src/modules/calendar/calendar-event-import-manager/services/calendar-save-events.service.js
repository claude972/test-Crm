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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarSaveEventsService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const feature_flag_service_1 = require("src/engine/core-modules/feature-flag/services/feature-flag.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const build_calendar_event_save_operations_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/build-calendar-event-save-operations.util");
const get_calendar_channel_handles_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/get-calendar-channel-handles.util");
const resolve_calendar_event_sharing_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/resolve-calendar-event-sharing.util");
const calendar_event_participant_service_1 = require("src/modules/calendar/calendar-event-participant-manager/services/calendar-event-participant.service");
const build_calendar_event_participant_save_operations_util_1 = require("src/modules/calendar/calendar-event-participant-manager/utils/build-calendar-event-participant-save-operations.util");
let CalendarSaveEventsService = class CalendarSaveEventsService {
    workspaceOrmManager;
    calendarEventParticipantService;
    featureFlagService;
    calendarChannelRepository;
    constructor(workspaceOrmManager, calendarEventParticipantService, featureFlagService, calendarChannelRepository) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.calendarEventParticipantService = calendarEventParticipantService;
        this.featureFlagService = featureFlagService;
        this.calendarChannelRepository = calendarChannelRepository;
    }
    async saveCalendarEventsAndEnqueueContactCreationJob(fetchedCalendarEvents, calendarChannel, connectedAccount, workspaceId) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        const isCalendarEventSharingEnabled = await this.featureFlagService.isFeatureEnabled(types_1.FeatureFlagKey.IS_CALENDAR_EVENT_SHARED_ACROSS_CHANNELS_ENABLED, workspaceId);
        const channelHandles = (0, get_calendar_channel_handles_util_1.getCalendarChannelHandles)({
            calendarChannel,
            connectedAccount,
        });
        const { savedParticipantIds, participantsOfLinkedEvents, calendarEventIds, } = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const calendarChannelEventAssociationRepository = this.workspaceOrmManager.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
            const calendarEventRepository = this.workspaceOrmManager.getRepository('calendarEvent', { shouldBypassPermissionChecks: true });
            const existingAssociations = await calendarChannelEventAssociationRepository.find({
                where: {
                    eventExternalId: (0, typeorm_1.Any)(fetchedCalendarEvents.map((event) => event.id)),
                    calendarChannelId: calendarChannel.id,
                },
            });
            const existingEventExternalIds = new Set(existingAssociations
                .map(({ eventExternalId }) => eventExternalId)
                .filter(guards_1.isNonEmptyString));
            // Not gated by the flag: events shared before it was turned off keep their roles
            const otherAssociationsOfExistingEvents = existingAssociations.length > 0
                ? await calendarChannelEventAssociationRepository.find({
                    where: {
                        calendarEventId: (0, typeorm_1.Any)(existingAssociations.map(({ calendarEventId }) => calendarEventId)),
                        calendarChannelId: (0, typeorm_1.Not)(calendarChannel.id),
                    },
                })
                : [];
            const linkCandidateAssociations = isCalendarEventSharingEnabled
                ? await this.findLinkCandidateAssociations({
                    calendarChannelEventAssociationRepository,
                    provider: connectedAccount.provider,
                    calendarChannelId: calendarChannel.id,
                    fetchedCalendarEvents: fetchedCalendarEvents.filter(({ id }) => !existingEventExternalIds.has(id)),
                })
                : [];
            const otherAssociations = [
                ...otherAssociationsOfExistingEvents,
                ...linkCandidateAssociations,
            ];
            const otherCalendarChannels = otherAssociations.length > 0
                ? await this.calendarChannelRepository.find(workspaceId, {
                    where: {
                        id: (0, typeorm_1.In)([
                            ...new Set(otherAssociations.map(({ calendarChannelId }) => calendarChannelId)),
                        ]),
                        connectedAccount: { provider: connectedAccount.provider },
                    },
                    relations: { connectedAccount: true },
                    select: {
                        id: true,
                        handle: true,
                        syncStatus: true,
                        isSyncEnabled: true,
                        connectedAccount: { id: true, handleAliases: true },
                    },
                })
                : [];
            const otherCalendarChannelIds = new Set(otherCalendarChannels.map(({ id }) => id));
            const sharedAssociations = otherAssociations.filter(({ calendarChannelId }) => otherCalendarChannelIds.has(calendarChannelId));
            const candidateCalendarEventIds = [
                ...new Set([...existingAssociations, ...sharedAssociations].map(({ calendarEventId }) => calendarEventId)),
            ];
            const candidateCalendarEvents = candidateCalendarEventIds.length > 0
                ? await calendarEventRepository.find({
                    where: { id: (0, typeorm_1.Any)(candidateCalendarEventIds) },
                })
                : [];
            const { calendarEventIdToLinkByEventExternalId, otherChannelIdsByCalendarEventId, } = (0, resolve_calendar_event_sharing_util_1.resolveCalendarEventSharing)({
                provider: connectedAccount.provider,
                fetchedCalendarEvents,
                existingEventExternalIds,
                sharedAssociations,
                iCalUidByCalendarEventId: new Map(candidateCalendarEvents.map(({ id, iCalUid }) => [id, iCalUid])),
                isCalendarEventSharingEnabled,
            });
            const storedCalendarEventIds = [
                ...existingAssociations.map((association) => association.calendarEventId),
                ...calendarEventIdToLinkByEventExternalId.values(),
            ];
            const { saveOperations, existingCalendarEventIds, channelRoleByCalendarEventId, participantsOfNewEvents, participantsOfExistingEvents, participantsOfLinkedEvents, } = (0, build_calendar_event_save_operations_util_1.buildCalendarEventSaveOperations)({
                fetchedCalendarEvents,
                existingAssociations,
                existingCalendarEvents: candidateCalendarEvents,
                calendarChannelId: calendarChannel.id,
                channelHandles,
                calendarEventIdToLinkByEventExternalId,
                otherChannelIdsByCalendarEventId,
                otherCalendarChannels,
            });
            const existingParticipants = await this.calendarEventParticipantService.findCalendarEventParticipantsByCalendarEventIds({ calendarEventIds: storedCalendarEventIds });
            const participantOperations = (0, build_calendar_event_participant_save_operations_util_1.buildCalendarEventParticipantSaveOperations)({
                fetchedParticipants: [
                    ...participantsOfNewEvents,
                    ...participantsOfExistingEvents,
                    ...participantsOfLinkedEvents,
                ],
                existingParticipants,
                channelRoleByCalendarEventId,
                channelHandles,
            });
            await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                const calendarEventRepository = transactionScope.getRepository('calendarEvent', { shouldBypassPermissionChecks: true });
                const associationRepository = transactionScope.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                if (saveOperations.calendarEventsToInsert.length > 0) {
                    await calendarEventRepository.insert(saveOperations.calendarEventsToInsert);
                }
                if (saveOperations.calendarEventsToUpdate.length > 0) {
                    await calendarEventRepository.updateMany(saveOperations.calendarEventsToUpdate);
                }
                if (saveOperations.associationsToInsert.length > 0) {
                    await associationRepository.insert(saveOperations.associationsToInsert);
                }
                if (saveOperations.associationsToUpdate.length > 0) {
                    await associationRepository.updateMany(saveOperations.associationsToUpdate);
                }
                await this.calendarEventParticipantService.writeCalendarEventParticipants({
                    operations: participantOperations,
                    transactionScope,
                });
            });
            return {
                savedParticipantIds: participantOperations.participantsToInsert.map((participant) => participant.id),
                participantsOfLinkedEvents,
                calendarEventIds: [
                    ...saveOperations.associationsToInsert.map(({ calendarEventId }) => calendarEventId),
                    ...existingCalendarEventIds,
                ],
            };
        }, authContext, { lite: true });
        await this.calendarEventParticipantService.matchParticipantsAndEnqueueContactCreationJob({
            savedParticipantIds,
            participantsOfLinkedEvents,
            calendarEventIds,
            calendarChannel,
            connectedAccount,
            workspaceId,
        });
        return { calendarEventIds };
    }
    async findLinkCandidateAssociations({ calendarChannelEventAssociationRepository, provider, calendarChannelId, fetchedCalendarEvents, }) {
        if (fetchedCalendarEvents.length === 0) {
            return [];
        }
        switch (provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return calendarChannelEventAssociationRepository.find({
                    where: {
                        eventExternalId: (0, typeorm_1.Any)(fetchedCalendarEvents.map(({ id }) => id)),
                        calendarChannelId: (0, typeorm_1.Not)(calendarChannelId),
                    },
                });
            case types_1.ConnectedAccountProvider.MICROSOFT: {
                const iCalUids = fetchedCalendarEvents
                    .map(({ iCalUid }) => iCalUid)
                    .filter(guards_1.isNonEmptyString);
                return iCalUids.length > 0
                    ? calendarChannelEventAssociationRepository.find({
                        where: {
                            calendarEvent: { iCalUid: (0, typeorm_1.Any)(iCalUids) },
                            calendarChannelId: (0, typeorm_1.Not)(calendarChannelId),
                        },
                    })
                    : [];
            }
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
            case types_1.ConnectedAccountProvider.OIDC:
            case types_1.ConnectedAccountProvider.SAML:
            case types_1.ConnectedAccountProvider.EMAIL_GROUP:
            case types_1.ConnectedAccountProvider.APP:
                return [];
            default:
                return (0, utils_1.assertUnreachable)(provider);
        }
    }
};
exports.CalendarSaveEventsService = CalendarSaveEventsService;
exports.CalendarSaveEventsService = CalendarSaveEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, calendar_event_participant_service_1.CalendarEventParticipantService, typeof (_b = typeof feature_flag_service_1.FeatureFlagService !== "undefined" && feature_flag_service_1.FeatureFlagService) === "function" ? _b : Object, typeof (_c = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _c : Object])
], CalendarSaveEventsService);
