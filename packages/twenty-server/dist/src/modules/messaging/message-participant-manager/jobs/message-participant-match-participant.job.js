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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageParticipantMatchParticipantJob = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const match_participant_service_1 = require("src/modules/match-participant/match-participant.service");
const person_handle_field_service_1 = require("src/modules/match-participant/person-handle-field/person-handle-field.service");
let MessageParticipantMatchParticipantJob = class MessageParticipantMatchParticipantJob {
    matchParticipantService;
    personHandleFieldService;
    constructor(matchParticipantService, personHandleFieldService) {
        this.matchParticipantService = matchParticipantService;
        this.personHandleFieldService = personHandleFieldService;
    }
    async handle(data) {
        const { participantMatching, personHandleMatching, workspaceId } = data;
        if (participantMatching.personEmails.length > 0) {
            await this.matchParticipantService.matchParticipantsForPeople({
                participantMatching,
                objectMetadataName: 'messageParticipant',
                workspaceId,
            });
        }
        for (const { fieldUniversalIdentifier, messageChannelIds, handles, changedPersonIds, } of personHandleMatching ?? []) {
            const personHandleField = await this.personHandleFieldService.findByUniversalIdentifier({
                workspaceId,
                fieldUniversalIdentifier,
            });
            if ((0, utils_1.isDefined)(personHandleField)) {
                await this.matchParticipantService.matchParticipantsForPersonHandles({
                    personHandleField,
                    messageChannelIds,
                    handles,
                    changedPersonIds,
                    workspaceId,
                });
            }
        }
        if (participantMatching.workspaceMemberIds.length > 0) {
            await this.matchParticipantService.matchParticipantsForWorkspaceMembers({
                participantMatching,
                objectMetadataName: 'messageParticipant',
                workspaceId,
            });
        }
    }
};
exports.MessageParticipantMatchParticipantJob = MessageParticipantMatchParticipantJob;
__decorate([
    (0, process_decorator_1.Process)(MessageParticipantMatchParticipantJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessageParticipantMatchParticipantJob.prototype, "handle", null);
exports.MessageParticipantMatchParticipantJob = MessageParticipantMatchParticipantJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof match_participant_service_1.MatchParticipantService !== "undefined" && match_participant_service_1.MatchParticipantService) === "function" ? _a : Object, typeof (_b = typeof person_handle_field_service_1.PersonHandleFieldService !== "undefined" && person_handle_field_service_1.PersonHandleFieldService) === "function" ? _b : Object])
], MessageParticipantMatchParticipantJob);
