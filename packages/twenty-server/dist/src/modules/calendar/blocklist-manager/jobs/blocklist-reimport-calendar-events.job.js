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
exports.BlocklistReimportCalendarEventsJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const group_blocklist_handles_by_owner_util_1 = require("src/modules/blocklist/utils/group-blocklist-handles-by-owner.util");
const calendar_channel_sync_status_service_1 = require("src/modules/calendar/common/services/calendar-channel-sync-status.service");
let BlocklistReimportCalendarEventsJob = class BlocklistReimportCalendarEventsJob {
    workspaceOrmManager;
    calendarChannelRepository;
    userWorkspaceRepository;
    calendarChannelSyncStatusService;
    constructor(workspaceOrmManager, calendarChannelRepository, userWorkspaceRepository, calendarChannelSyncStatusService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.calendarChannelRepository = calendarChannelRepository;
        this.userWorkspaceRepository = userWorkspaceRepository;
        this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
    }
    async handle(data) {
        const workspaceId = data.workspaceId;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const { workspaceScopedHandles, handlesByWorkspaceMemberId } = (0, group_blocklist_handles_by_owner_util_1.groupBlocklistHandlesByOwner)(data.events.map((eventPayload) => eventPayload.properties.before));
            const calendarChannelIdsToReset = new Set();
            if (workspaceScopedHandles.length > 0) {
                for (const calendarChannelId of await this.findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId: null })) {
                    calendarChannelIdsToReset.add(calendarChannelId);
                }
            }
            for (const workspaceMemberId of handlesByWorkspaceMemberId.keys()) {
                const userWorkspaceId = await this.findWorkspaceMemberUserWorkspaceId({
                    workspaceMemberId,
                    workspaceId,
                });
                if (!(0, utils_1.isDefined)(userWorkspaceId)) {
                    continue;
                }
                for (const calendarChannelId of await this.findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId })) {
                    calendarChannelIdsToReset.add(calendarChannelId);
                }
            }
            if (calendarChannelIdsToReset.size === 0) {
                return;
            }
            await this.calendarChannelSyncStatusService.resetAndMarkAsCalendarEventListFetchPending([...calendarChannelIdsToReset], workspaceId);
        }, authContext, { lite: true });
    }
    async findWorkspaceMemberUserWorkspaceId({ workspaceMemberId, workspaceId, }) {
        const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
        const workspaceMember = await workspaceMemberRepository.findOne({
            where: { id: workspaceMemberId },
        });
        if (!(0, utils_1.isDefined)(workspaceMember)) {
            return null;
        }
        const userWorkspace = await this.userWorkspaceRepository.findOne({
            where: { userId: workspaceMember.userId, workspaceId },
            select: ['id'],
        });
        return userWorkspace?.id ?? null;
    }
    async findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId, }) {
        const where = {
            syncStage: (0, typeorm_2.Not)(types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING),
            workspaceId,
        };
        if ((0, utils_1.isDefined)(userWorkspaceId)) {
            where.connectedAccount = { userWorkspaceId };
        }
        const calendarChannels = await this.calendarChannelRepository.find({
            select: ['id'],
            where,
        });
        return calendarChannels.map((calendarChannel) => calendarChannel.id);
    }
};
exports.BlocklistReimportCalendarEventsJob = BlocklistReimportCalendarEventsJob;
__decorate([
    (0, process_decorator_1.Process)(BlocklistReimportCalendarEventsJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof BlocklistReimportCalendarEventsJobData !== "undefined" && BlocklistReimportCalendarEventsJobData) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], BlocklistReimportCalendarEventsJob.prototype, "handle", null);
exports.BlocklistReimportCalendarEventsJob = BlocklistReimportCalendarEventsJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.calendarQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(user_workspace_entity_1.UserWorkspaceEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, Function, Function, calendar_channel_sync_status_service_1.CalendarChannelSyncStatusService])
], BlocklistReimportCalendarEventsJob);
