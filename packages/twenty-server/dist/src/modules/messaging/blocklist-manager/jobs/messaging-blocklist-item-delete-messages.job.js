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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlocklistItemDeleteMessagesJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const group_blocklist_handles_by_owner_util_1 = require("src/modules/blocklist/utils/group-blocklist-handles-by-owner.util");
const blocklisted_participant_roles_constant_1 = require("src/modules/messaging/blocklist-manager/constants/blocklisted-participant-roles.constant");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
let BlocklistItemDeleteMessagesJob = class BlocklistItemDeleteMessagesJob {
    threadCleanerService;
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
                    id: (0, typeorm_2.Any)(blocklistItemIds),
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
                connectedAccountId: (0, typeorm_2.In)(connectedAccounts.map((connectedAccount) => connectedAccount.id)),
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
                        handle: (0, typeorm_2.And)((0, typeorm_2.Or)((0, typeorm_2.ILike)(`%${handle}`), (0, typeorm_2.ILike)(`%.${handle.slice(1)}`)), (0, typeorm_2.Not)((0, typeorm_2.In)(messageChannelHandles))),
                        role: (0, typeorm_2.In)(blocklisted_participant_roles_constant_1.BLOCKLISTED_PARTICIPANT_ROLES),
                    }
                    : { handle, role: (0, typeorm_2.In)(blocklisted_participant_roles_constant_1.BLOCKLISTED_PARTICIPANT_ROLES) };
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
                    messageId: (0, typeorm_2.In)(messageIds),
                },
            });
            if (messageChannelMessageAssociationsToDelete.length === 0) {
                continue;
            }
            await messageChannelMessageAssociationRepository.delete(messageChannelMessageAssociationsToDelete.map(({ id }) => id));
        }
    }
};
exports.BlocklistItemDeleteMessagesJob = BlocklistItemDeleteMessagesJob;
__decorate([
    (0, process_decorator_1.Process)(BlocklistItemDeleteMessagesJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof BlocklistItemDeleteMessagesJobData !== "undefined" && BlocklistItemDeleteMessagesJobData) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], BlocklistItemDeleteMessagesJob.prototype, "handle", null);
exports.BlocklistItemDeleteMessagesJob = BlocklistItemDeleteMessagesJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(2, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [messaging_message_cleaner_service_1.MessagingMessageCleanerService, typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BlocklistItemDeleteMessagesJob);
