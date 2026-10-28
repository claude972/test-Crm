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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageParticipantPersonListener = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
const object_record_changed_properties_util_1 = require("src/engine/core-modules/event-emitter/utils/object-record-changed-properties.util");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_event_batch_type_1 = require("src/engine/workspace-event-emitter/types/workspace-event-batch.type");
const person_handle_field_service_1 = require("src/modules/match-participant/person-handle-field/person-handle-field.service");
const get_changed_person_handles_util_1 = require("src/modules/match-participant/person-handle-field/utils/get-changed-person-handles.util");
const get_person_emails_util_1 = require("src/modules/match-participant/utils/get-person-emails.util");
const message_participant_match_participant_job_1 = require("src/modules/messaging/message-participant-manager/jobs/message-participant-match-participant.job");
let MessageParticipantPersonListener = class MessageParticipantPersonListener {
    messageQueueService;
    messageChannelRepository;
    personHandleFieldService;
    constructor(messageQueueService, messageChannelRepository, personHandleFieldService) {
        this.messageQueueService = messageQueueService;
        this.messageChannelRepository = messageChannelRepository;
        this.personHandleFieldService = personHandleFieldService;
    }
    async handleCreatedEvent(payload) {
        const personWithEmails = payload.events.filter((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails).length > 0);
        const personHandleMatching = await this.buildPersonHandleMatching({
            workspaceId: payload.workspaceId,
            personChanges: payload.events.map((eventPayload) => ({
                personId: eventPayload.recordId,
                before: null,
                after: eventPayload.properties.after,
            })),
        });
        await this.enqueueMatching({
            workspaceId: payload.workspaceId,
            participantMatching: {
                personEmails: personWithEmails.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails)),
                workspaceMemberIds: [],
            },
            personHandleMatching,
        });
    }
    async handleUpdatedEvent(payload) {
        const personChanges = payload.events.map((eventPayload) => ({
            personId: eventPayload.recordId,
            before: eventPayload.properties.before,
            after: eventPayload.properties.after,
            changedFieldNames: (0, object_record_changed_properties_util_1.objectRecordChangedProperties)(eventPayload.properties.before, eventPayload.properties.after),
        }));
        const personHandleMatching = await this.buildPersonHandleMatching({
            workspaceId: payload.workspaceId,
            personChanges,
        });
        await this.enqueueMatching({
            workspaceId: payload.workspaceId,
            participantMatching: {
                personEmails: personChanges
                    .filter(({ changedFieldNames }) => changedFieldNames.includes('emails'))
                    .flatMap(({ before, after }) => [
                    ...(0, get_person_emails_util_1.getPersonEmails)(before.emails),
                    ...(0, get_person_emails_util_1.getPersonEmails)(after.emails),
                ]),
                workspaceMemberIds: [],
            },
            personHandleMatching,
        });
    }
    async enqueueMatching(data) {
        if (data.participantMatching.personEmails.length === 0 &&
            (data.personHandleMatching ?? []).length === 0) {
            return;
        }
        await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, data);
    }
    async buildPersonHandleMatching({ workspaceId, personChanges, }) {
        const changedHandlesByFieldUniversalIdentifier = new Map();
        for (const personHandleField of await this.personHandleFieldService.findAll(workspaceId)) {
            const changedHandles = (0, get_changed_person_handles_util_1.getChangedPersonHandles)({
                personHandleField,
                personChanges: personChanges.filter(({ changedFieldNames }) => !(0, utils_1.isDefined)(changedFieldNames) ||
                    changedFieldNames.includes(personHandleField.name)),
            });
            if (changedHandles.handles.length > 0) {
                changedHandlesByFieldUniversalIdentifier.set(personHandleField.universalIdentifier, changedHandles);
            }
        }
        // most person writes stop here, before any channel lookup
        if (changedHandlesByFieldUniversalIdentifier.size === 0) {
            return [];
        }
        const messageChannels = await this.messageChannelRepository.find({
            where: {
                workspaceId,
                type: types_1.MessageChannelType.APP,
                participantHandleFieldUniversalIdentifier: (0, typeorm_2.In)([
                    ...changedHandlesByFieldUniversalIdentifier.keys(),
                ]),
            },
            select: { id: true, participantHandleFieldUniversalIdentifier: true },
        });
        return [...changedHandlesByFieldUniversalIdentifier].flatMap(([fieldUniversalIdentifier, { handles, changedPersonIds }]) => {
            const messageChannelIds = messageChannels
                .filter((messageChannel) => messageChannel.participantHandleFieldUniversalIdentifier ===
                fieldUniversalIdentifier)
                .map((messageChannel) => messageChannel.id);
            if (messageChannelIds.length === 0) {
                return [];
            }
            return [
                {
                    fieldUniversalIdentifier,
                    messageChannelIds,
                    handles,
                    changedPersonIds,
                },
            ];
        });
    }
    async handleDestroyedEvent(payload) {
        const personHandleMatching = await this.buildPersonHandleMatching({
            workspaceId: payload.workspaceId,
            personChanges: payload.events.map((eventPayload) => ({
                personId: eventPayload.recordId,
                before: eventPayload.properties.before,
                after: null,
            })),
        });
        await this.enqueueMatching({
            workspaceId: payload.workspaceId,
            participantMatching: {
                personEmails: payload.events.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.before.emails)),
                workspaceMemberIds: [],
            },
            personHandleMatching,
        });
    }
};
exports.MessageParticipantPersonListener = MessageParticipantPersonListener;
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantPersonListener.prototype, "handleCreatedEvent", null);
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantPersonListener.prototype, "handleUpdatedEvent", null);
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.DESTROYED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_e = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _e : Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantPersonListener.prototype, "handleDestroyedEvent", null);
exports.MessageParticipantPersonListener = MessageParticipantPersonListener = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof person_handle_field_service_1.PersonHandleFieldService !== "undefined" && person_handle_field_service_1.PersonHandleFieldService) === "function" ? _b : Object])
], MessageParticipantPersonListener);
