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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventParticipantService = void 0;
const common_1 = require("@nestjs/common");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const types_1 = require("kovaa-lab-shared/types");
const typeorm_1 = require("typeorm");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_participant_chunk_size_1 = require("src/modules/calendar/calendar-event-participant-manager/constants/calendar-event-participant-chunk-size");
const create_company_and_contact_job_1 = require("src/modules/contact-creation-manager/jobs/create-company-and-contact.job");
const match_participant_service_1 = require("src/modules/match-participant/match-participant.service");
let CalendarEventParticipantService = class CalendarEventParticipantService {
    workspaceOrmManager;
    matchParticipantService;
    messageQueueService;
    constructor(workspaceOrmManager, matchParticipantService, messageQueueService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.matchParticipantService = matchParticipantService;
        this.messageQueueService = messageQueueService;
    }
    async findCalendarEventParticipantsByCalendarEventIds({ calendarEventIds, }) {
        const calendarEventParticipantRepository = this.workspaceOrmManager.getRepository('calendarEventParticipant', { shouldBypassPermissionChecks: true });
        return calendarEventParticipantRepository.find({
            where: { calendarEventId: (0, typeorm_1.Any)([...new Set(calendarEventIds)]) },
        });
    }
    async writeCalendarEventParticipants({ operations, transactionScope, }) {
        const calendarEventParticipantRepository = transactionScope.getRepository('calendarEventParticipant', { shouldBypassPermissionChecks: true });
        if (operations.participantIdsToDelete.length > 0) {
            await calendarEventParticipantRepository.delete({
                id: (0, typeorm_1.Any)(operations.participantIdsToDelete),
            });
        }
        for (const participantsChunk of (0, lodash_chunk_1.default)(operations.participantsToUpdate, calendar_event_participant_chunk_size_1.CALENDAR_EVENT_PARTICIPANT_CHUNK_SIZE)) {
            await calendarEventParticipantRepository.updateMany(participantsChunk);
        }
        for (const participantsChunk of (0, lodash_chunk_1.default)(operations.participantsToInsert, calendar_event_participant_chunk_size_1.CALENDAR_EVENT_PARTICIPANT_CHUNK_SIZE)) {
            await calendarEventParticipantRepository.insert(participantsChunk);
        }
    }
    async matchParticipantsAndEnqueueContactCreationJob({ savedParticipantIds, participantsOfLinkedEvents, calendarChannel, connectedAccount, workspaceId, calendarEventIds, }) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const calendarEventParticipantRepository = this.workspaceOrmManager.getRepository('calendarEventParticipant', { shouldBypassPermissionChecks: true });
            const savedParticipants = [];
            for (const savedParticipantIdsChunk of (0, lodash_chunk_1.default)(savedParticipantIds, calendar_event_participant_chunk_size_1.CALENDAR_EVENT_PARTICIPANT_CHUNK_SIZE)) {
                const participantsChunk = await calendarEventParticipantRepository.find({
                    where: { id: (0, typeorm_1.In)(savedParticipantIdsChunk) },
                });
                savedParticipants.push(...participantsChunk);
            }
            if (calendarChannel.isContactAutoCreationEnabled) {
                await this.messageQueueService.add(create_company_and_contact_job_1.CreateCompanyAndContactJob.name, {
                    workspaceId,
                    connectedAccount,
                    contactsToCreate: [
                        ...savedParticipants,
                        ...participantsOfLinkedEvents,
                    ].map((participant) => ({
                        handle: participant.handle ?? '',
                        displayName: participant.displayName ?? participant.handle ?? '',
                    })),
                    source: types_1.FieldActorSource.CALENDAR,
                });
            }
            await this.matchParticipantService.matchParticipants({
                participants: savedParticipants,
                sourceRecordIds: calendarEventIds,
                objectMetadataName: 'calendarEventParticipant',
                matchWith: 'workspaceMemberAndPerson',
            });
        }, authContext, { lite: true });
    }
};
exports.CalendarEventParticipantService = CalendarEventParticipantService;
exports.CalendarEventParticipantService = CalendarEventParticipantService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.contactCreationQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof match_participant_service_1.MatchParticipantService !== "undefined" && match_participant_service_1.MatchParticipantService) === "function" ? _b : Object, typeof (_c = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _c : Object])
], CalendarEventParticipantService);
