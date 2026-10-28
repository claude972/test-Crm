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
exports.MessageParticipantWorkspaceMemberListener = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
const object_record_changed_properties_util_1 = require("src/engine/core-modules/event-emitter/utils/object-record-changed-properties.util");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const workspace_event_batch_type_1 = require("src/engine/workspace-event-emitter/types/workspace-event-batch.type");
const message_participant_match_participant_job_1 = require("src/modules/messaging/message-participant-manager/jobs/message-participant-match-participant.job");
let MessageParticipantWorkspaceMemberListener = class MessageParticipantWorkspaceMemberListener {
    messageQueueService;
    workspaceRepository;
    constructor(messageQueueService, workspaceRepository) {
        this.messageQueueService = messageQueueService;
        this.workspaceRepository = workspaceRepository;
    }
    async handleCreatedEvent(payload) {
        const workspace = await this.workspaceRepository.findOneBy({
            id: payload.workspaceId,
        });
        if (!workspace ||
            workspace.activationStatus !== workspace_1.WorkspaceActivationStatus.ACTIVE) {
            return;
        }
        for (const eventPayload of payload.events) {
            if (!eventPayload.properties.after.userEmail) {
                continue;
            }
            await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, {
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails: [],
                    workspaceMemberIds: [eventPayload.recordId],
                },
            });
        }
    }
    async handleUpdatedEvent(payload) {
        for (const eventPayload of payload.events) {
            if ((0, object_record_changed_properties_util_1.objectRecordChangedProperties)(eventPayload.properties.before, eventPayload.properties.after).includes('userEmail')) {
                await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, {
                    workspaceId: payload.workspaceId,
                    participantMatching: {
                        personEmails: [],
                        workspaceMemberIds: [eventPayload.recordId],
                    },
                });
            }
        }
    }
};
exports.MessageParticipantWorkspaceMemberListener = MessageParticipantWorkspaceMemberListener;
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('workspaceMember', database_event_action_1.DatabaseEventAction.CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantWorkspaceMemberListener.prototype, "handleCreatedEvent", null);
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('workspaceMember', database_event_action_1.DatabaseEventAction.UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantWorkspaceMemberListener.prototype, "handleUpdatedEvent", null);
exports.MessageParticipantWorkspaceMemberListener = MessageParticipantWorkspaceMemberListener = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __param(1, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeorm_2.Repository])
], MessageParticipantWorkspaceMemberListener);
