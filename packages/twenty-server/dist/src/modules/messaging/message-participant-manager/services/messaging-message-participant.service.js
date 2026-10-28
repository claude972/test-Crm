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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageParticipantService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const constants_1 = require("kovaa-lab-shared/constants");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const match_participant_service_1 = require("src/modules/match-participant/match-participant.service");
let MessagingMessageParticipantService = class MessagingMessageParticipantService {
    workspaceOrmManager;
    matchParticipantService;
    constructor(workspaceOrmManager, matchParticipantService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.matchParticipantService = matchParticipantService;
    }
    async saveMessageParticipants(participants, workspaceId, transactionScope) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageParticipantRepository = transactionScope.getRepository('messageParticipant', { shouldBypassPermissionChecks: true });
            const existingParticipantsBasedOnMessageIds = await messageParticipantRepository.find({
                where: {
                    messageId: (0, typeorm_1.In)(participants.map((participant) => participant.messageId)),
                },
            });
            const suppliesIdentity = (participant) => (0, utils_1.isDefined)(participant.personId) ||
                (0, utils_1.isDefined)(participant.workspaceMemberId);
            // Caller-identified rows match on message, handle and role only: displayName can drift between deliveries
            const findExisting = (participant) => existingParticipantsBasedOnMessageIds.find((existingParticipant) => existingParticipant.messageId === participant.messageId &&
                existingParticipant.handle === participant.handle &&
                existingParticipant.role === participant.role &&
                (suppliesIdentity(participant) ||
                    existingParticipant.displayName === participant.displayName));
            // Paired once: the lookup scans every existing row
            const participantsWithExisting = participants.map((participant) => ({
                participant,
                existingParticipant: findExisting(participant),
            }));
            const participantsToCreate = participantsWithExisting
                .filter(({ existingParticipant }) => !(0, utils_1.isDefined)(existingParticipant))
                .map(({ participant }) => {
                return {
                    messageId: participant.messageId,
                    handle: participant.handle,
                    displayName: participant.displayName,
                    role: participant.role,
                    personId: participant.personId ?? null,
                    workspaceMemberId: participant.workspaceMemberId ?? null,
                };
            });
            // Without this a re-ingested participant would keep its original unlinked row forever
            const identityUpdates = participantsWithExisting.flatMap(({ participant, existingParticipant }) => {
                if (!(0, utils_1.isDefined)(existingParticipant) ||
                    !suppliesIdentity(participant)) {
                    return [];
                }
                const personId = participant.personId ?? existingParticipant.personId;
                const workspaceMemberId = participant.workspaceMemberId ??
                    existingParticipant.workspaceMemberId;
                // An omitted name arrives as '', which must not erase one an earlier delivery supplied
                const displayName = (0, guards_1.isNonEmptyString)(participant.displayName)
                    ? participant.displayName
                    : existingParticipant.displayName;
                if (personId === existingParticipant.personId &&
                    workspaceMemberId === existingParticipant.workspaceMemberId &&
                    displayName === existingParticipant.displayName) {
                    return [];
                }
                return [
                    {
                        criteria: existingParticipant.id,
                        partialEntity: { personId, workspaceMemberId, displayName },
                    },
                ];
            });
            // Batches are bounded by messages, not participants, so they can exceed what updateMany accepts
            for (const identityUpdatesChunk of (0, lodash_chunk_1.default)(identityUpdates, constants_1.QUERY_MAX_RECORDS)) {
                await messageParticipantRepository.updateMany(identityUpdatesChunk);
            }
            const { identifiers } = await messageParticipantRepository.insert(participantsToCreate);
            const touchedIds = [
                ...identifiers.map(({ id }) => id),
                ...identityUpdates.map(({ criteria }) => criteria),
            ];
            return messageParticipantRepository.find({
                where: { id: (0, typeorm_1.In)(touchedIds) },
            });
        }, authContext, { lite: true });
    }
    async matchMessageParticipants({ participants, messageIds, workspaceId, matchWith = 'workspaceMemberAndPerson', personHandleField, }) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            await this.matchParticipantService.matchParticipants({
                participants,
                sourceRecordIds: messageIds,
                objectMetadataName: 'messageParticipant',
                matchWith,
                personHandleField,
            });
        }, authContext, { lite: true });
    }
};
exports.MessagingMessageParticipantService = MessagingMessageParticipantService;
exports.MessagingMessageParticipantService = MessagingMessageParticipantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof match_participant_service_1.MatchParticipantService !== "undefined" && match_participant_service_1.MatchParticipantService) === "function" ? _b : Object])
], MessagingMessageParticipantService);
