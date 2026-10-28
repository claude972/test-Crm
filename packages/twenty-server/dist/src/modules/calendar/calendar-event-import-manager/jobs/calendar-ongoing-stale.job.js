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
var CalendarOngoingStaleJob_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarOngoingStaleJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_ongoing_stale_sync_stages_constant_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-ongoing-stale-sync-stages.constant");
const is_sync_stale_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/is-sync-stale.util");
const calendar_channel_sync_status_service_1 = require("src/modules/calendar/common/services/calendar-channel-sync-status.service");
let CalendarOngoingStaleJob = CalendarOngoingStaleJob_1 = class CalendarOngoingStaleJob {
    workspaceOrmManager;
    calendarChannelRepository;
    calendarChannelSyncStatusService;
    logger = new common_1.Logger(CalendarOngoingStaleJob_1.name);
    constructor(workspaceOrmManager, calendarChannelRepository, calendarChannelSyncStatusService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.calendarChannelRepository = calendarChannelRepository;
        this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
    }
    async handle(data) {
        const { workspaceId } = data;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const calendarChannels = await this.calendarChannelRepository.find({
                where: {
                    syncStage: (0, typeorm_2.In)(calendar_ongoing_stale_sync_stages_constant_1.CALENDAR_ONGOING_STALE_SYNC_STAGES),
                    workspaceId,
                },
            });
            for (const calendarChannel of calendarChannels) {
                const syncStageStartedAt = calendarChannel.syncStageStartedAt;
                if ((0, is_sync_stale_util_1.isSyncStale)(syncStageStartedAt?.toISOString() ?? null)) {
                    await this.calendarChannelSyncStatusService.resetSyncStageStartedAt([calendarChannel.id], workspaceId);
                    switch (calendarChannel.syncStage) {
                        case types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_ONGOING:
                        case types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_SCHEDULED:
                            this.logger.log(`Sync for calendar channel ${calendarChannel.id} and workspace ${workspaceId} is stale. Setting sync stage to CALENDAR_EVENT_LIST_FETCH_PENDING`);
                            await this.calendarChannelSyncStatusService.markAsCalendarEventListFetchPending([calendarChannel.id], workspaceId);
                            break;
                        case types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_ONGOING:
                        case types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_SCHEDULED:
                            this.logger.log(`Sync for calendar channel ${calendarChannel.id} and workspace ${workspaceId} is stale. Setting sync stage to CALENDAR_EVENTS_IMPORT_PENDING`);
                            await this.calendarChannelSyncStatusService.markAsCalendarEventsImportPending([calendarChannel.id], workspaceId);
                            break;
                        default:
                            break;
                    }
                }
            }
        }, authContext, { lite: true });
    }
};
exports.CalendarOngoingStaleJob = CalendarOngoingStaleJob;
__decorate([
    (0, process_decorator_1.Process)(CalendarOngoingStaleJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarOngoingStaleJob.prototype, "handle", null);
exports.CalendarOngoingStaleJob = CalendarOngoingStaleJob = CalendarOngoingStaleJob_1 = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.calendarQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository,
        calendar_channel_sync_status_service_1.CalendarChannelSyncStatusService])
], CalendarOngoingStaleJob);
