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
exports.CalendarEventParticipantService = void 0;
const common_1 = require("@nestjs/common");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const types_1 = require("kovaa-lab-shared/types");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_participant_chunk_size_1 = require("src/modules/calendar/calendar-event-participant-manager/constants/calendar-event-participant-chunk-size");
const create_company_and_contact_job_1 = require("src/modules/contact-creation-manager/jobs/create-company-and-contact.job");
let CalendarEventParticipantService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarEventParticipantService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventParticipantService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return CalendarEventParticipantService = _classThis;
})();
exports.CalendarEventParticipantService = CalendarEventParticipantService;
