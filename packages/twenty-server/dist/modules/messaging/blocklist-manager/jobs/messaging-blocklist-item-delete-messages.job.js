"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlocklistItemDeleteMessagesJob = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const group_blocklist_handles_by_owner_util_1 = require("src/modules/blocklist/utils/group-blocklist-handles-by-owner.util");
const blocklisted_participant_roles_constant_1 = require("src/modules/messaging/blocklist-manager/constants/blocklisted-participant-roles.constant");
let BlocklistItemDeleteMessagesJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)({
            queueName: message_queue_constants_1.MessageQueue.messagingQueue,
            scope: common_1.Scope.REQUEST,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var BlocklistItemDeleteMessagesJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(BlocklistItemDeleteMessagesJob.name)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BlocklistItemDeleteMessagesJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        threadCleanerService = __runInitializers(this, _instanceExtraInitializers);
        workspaceOrmManager;
        messageChannelRepository;
        connectedAccountRepository;
        userWorkspaceRepository;
        constructor(threadCleanerService, workspaceOrmManager, messageChannelRepository, connectedAccountRepository, userWorkspaceRepository) {
            this.threadCleanerService = threadCleanerService;
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageChannelRepository = messageChannelRepository;
            this.connectedAccountRepository = connectedAccountRepository;
            this.userWorkspaceRepository = userWorkspaceRepository;
        }
        async handle(data) {
            const workspaceId = data.workspaceId;
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const blocklistItemIds = data.events.map((eventPayload) => eventPayload.recordId);
                const blocklistRepository = this.workspaceOrmManager.getRepository('blocklist', { shouldBypassPermissionChecks: true });
                const blocklist = await blocklistRepository.find({
                    where: {
                        id: (0, typeorm_1.Any)(blocklistItemIds),
                    },
                });
                const { workspaceScopedHandles, handlesByWorkspaceMemberId } = (0, group_blocklist_handles_by_owner_util_1.groupBlocklistHandlesByOwner)(blocklist);
                if (workspaceScopedHandles.length > 0) {
                    await this.deleteMessagesForMessageChannels({
                        messageChannels: await this.findWorkspaceMessageChannels(workspaceId),
                        handles: workspaceScopedHandles,
                    });
                }
                for (const [workspaceMemberId, handles] of handlesByWorkspaceMemberId) {
                    await this.deleteMessagesForMessageChannels({
                        messageChannels: await this.findWorkspaceMemberMessageChannels({
                            workspaceMemberId,
                            workspaceId,
                        }),
                        handles,
                    });
                }
                await this.threadCleanerService.cleanOrphanMessagesAndThreads(workspaceId);
            }, authContext, { lite: true });
        }
        async findWorkspaceMessageChannels(workspaceId) {
            return this.messageChannelRepository.find({
                select: {
                    id: true,
                    handle: true,
                    connectedAccount: {
                        handleAliases: true,
                    },
                },
                where: { workspaceId },
                relations: { connectedAccount: true },
            });
        }
        async findWorkspaceMemberMessageChannels({ workspaceMemberId, workspaceId, }) {
            const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
            const workspaceMember = await workspaceMemberRepository.findOne({
                where: { id: workspaceMemberId },
            });
            if (!(0, utils_1.isDefined)(workspaceMember)) {
                return [];
            }
            const userWorkspace = await this.userWorkspaceRepository.findOne({
                where: { userId: workspaceMember.userId, workspaceId },
            });
            if (!(0, utils_1.isDefined)(userWorkspace)) {
                return [];
            }
            const connectedAccounts = await this.connectedAccountRepository.find({
                where: { userWorkspaceId: userWorkspace.id, workspaceId },
            });
            if (connectedAccounts.length === 0) {
                return [];
            }
            return this.messageChannelRepository.find({
                select: {
                    id: true,
                    handle: true,
                    connectedAccount: {
                        handleAliases: true,
                    },
                },
                where: {
                    connectedAccountId: (0, typeorm_1.In)(connectedAccounts.map((connectedAccount) => connectedAccount.id)),
                    workspaceId,
                },
                relations: { connectedAccount: true },
            });
        }
        async deleteMessagesForMessageChannels({ messageChannels, handles, }) {
            const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
            const messageParticipantRepository = this.workspaceOrmManager.getRepository('messageParticipant', { shouldBypassPermissionChecks: true });
            for (const messageChannel of messageChannels) {
                const messageChannelHandles = [
                    messageChannel.handle,
                    ...(messageChannel.connectedAccount?.handleAliases ?? []),
                ];
                const handleConditions = handles.map((handle) => {
                    const isHandleDomain = handle.startsWith('@');
                    return isHandleDomain
                        ? {
                            handle: (0, typeorm_1.And)((0, typeorm_1.Or)((0, typeorm_1.ILike)(`%${handle}`), (0, typeorm_1.ILike)(`%.${handle.slice(1)}`)), (0, typeorm_1.Not)((0, typeorm_1.In)(messageChannelHandles))),
                            role: (0, typeorm_1.In)(blocklisted_participant_roles_constant_1.BLOCKLISTED_PARTICIPANT_ROLES),
                        }
                        : { handle, role: (0, typeorm_1.In)(blocklisted_participant_roles_constant_1.BLOCKLISTED_PARTICIPANT_ROLES) };
                });
                const matchingParticipants = await messageParticipantRepository.find({
                    where: handleConditions,
                    select: { messageId: true },
                });
                const messageIds = [
                    ...new Set(matchingParticipants.map((participant) => participant.messageId)),
                ];
                if (messageIds.length === 0) {
                    continue;
                }
                const messageChannelMessageAssociationsToDelete = await messageChannelMessageAssociationRepository.find({
                    where: {
                        messageChannelId: messageChannel.id,
                        messageId: (0, typeorm_1.In)(messageIds),
                    },
                });
                if (messageChannelMessageAssociationsToDelete.length === 0) {
                    continue;
                }
                await messageChannelMessageAssociationRepository.delete(messageChannelMessageAssociationsToDelete.map(({ id }) => id));
            }
        }
    };
    return BlocklistItemDeleteMessagesJob = _classThis;
})();
exports.BlocklistItemDeleteMessagesJob = BlocklistItemDeleteMessagesJob;
