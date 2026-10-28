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
exports.MessagingMessageParticipantService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const constants_1 = require("kovaa-lab-shared/constants");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingMessageParticipantService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageParticipantService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageParticipantService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return MessagingMessageParticipantService = _classThis;
})();
exports.MessagingMessageParticipantService = MessagingMessageParticipantService;
