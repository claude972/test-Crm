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
exports.BlocklistReimportMessagesJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const types_1 = require("kovaa-lab-shared/types");
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
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
let BlocklistReimportMessagesJob = class BlocklistReimportMessagesJob {
    workspaceOrmManager;
    messageChannelRepository;
    connectedAccountRepository;
    userWorkspaceRepository;
    messagingChannelSyncStatusService;
    constructor(workspaceOrmManager, messageChannelRepository, connectedAccountRepository, userWorkspaceRepository, messagingChannelSyncStatusService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.connectedAccountRepository = connectedAccountRepository;
        this.userWorkspaceRepository = userWorkspaceRepository;
        this.messagingChannelSyncStatusService = messagingChannelSyncStatusService;
    }
    async handle(data) {
        const workspaceId = data.workspaceId;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const { workspaceScopedHandles, handlesByWorkspaceMemberId } = (0, group_blocklist_handles_by_owner_util_1.groupBlocklistHandlesByOwner)(data.events.map((eventPayload) => eventPayload.properties.before));
            const messageChannelIdsToReset = new Set();
            if (workspaceScopedHandles.length > 0) {
                for (const messageChannelId of await this.findMessageChannelIdsToReset({ workspaceId, connectedAccountIds: null })) {
                    messageChannelIdsToReset.add(messageChannelId);
                }
            }
            for (const workspaceMemberId of handlesByWorkspaceMemberId.keys()) {
                const connectedAccountIds = await this.findWorkspaceMemberConnectedAccountIds({
                    workspaceMemberId,
                    workspaceId,
                });
                if (connectedAccountIds.length === 0) {
                    continue;
                }
                for (const messageChannelId of await this.findMessageChannelIdsToReset({ workspaceId, connectedAccountIds })) {
                    messageChannelIdsToReset.add(messageChannelId);
                }
            }
            if (messageChannelIdsToReset.size === 0) {
                return;
            }
            await this.messagingChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending([...messageChannelIdsToReset], workspaceId);
        }, authContext, { lite: true });
    }
    async findWorkspaceMemberConnectedAccountIds({ workspaceMemberId, workspaceId, }) {
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
            select: ['id'],
            where: { userWorkspaceId: userWorkspace.id, workspaceId },
        });
        return connectedAccounts.map((connectedAccount) => connectedAccount.id);
    }
    async findMessageChannelIdsToReset({ workspaceId, connectedAccountIds, }) {
        const where = {
            syncStage: (0, typeorm_2.Not)(types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING),
            workspaceId,
        };
        if ((0, utils_1.isDefined)(connectedAccountIds)) {
            where.connectedAccountId = (0, typeorm_2.In)(connectedAccountIds);
        }
        const messageChannels = await this.messageChannelRepository.find({
            select: ['id'],
            where,
        });
        return messageChannels.map((messageChannel) => messageChannel.id);
    }
};
exports.BlocklistReimportMessagesJob = BlocklistReimportMessagesJob;
__decorate([
    (0, process_decorator_1.Process)(BlocklistReimportMessagesJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof BlocklistReimportMessagesJobData !== "undefined" && BlocklistReimportMessagesJobData) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], BlocklistReimportMessagesJob.prototype, "handle", null);
exports.BlocklistReimportMessagesJob = BlocklistReimportMessagesJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        message_channel_sync_status_service_1.MessageChannelSyncStatusService])
], BlocklistReimportMessagesJob);
