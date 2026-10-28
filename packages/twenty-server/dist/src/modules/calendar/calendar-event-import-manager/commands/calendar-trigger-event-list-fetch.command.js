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
var CalendarTriggerEventListFetchCommand_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarTriggerEventListFetchCommand = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nest_commander_1 = require("nest-commander");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_event_list_fetch_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-event-list-fetch.job");
let CalendarTriggerEventListFetchCommand = CalendarTriggerEventListFetchCommand_1 = class CalendarTriggerEventListFetchCommand extends nest_commander_1.CommandRunner {
    workspaceOrmManager;
    calendarChannelRepository;
    messageQueueService;
    logger = new common_1.Logger(CalendarTriggerEventListFetchCommand_1.name);
    constructor(workspaceOrmManager, calendarChannelRepository, messageQueueService) {
        super();
        this.workspaceOrmManager = workspaceOrmManager;
        this.calendarChannelRepository = calendarChannelRepository;
        this.messageQueueService = messageQueueService;
    }
    async run(_passedParam, options) {
        const { workspaceId, calendarChannelId } = options;
        this.logger.log(`Triggering calendar event list fetch for workspace ${workspaceId}${calendarChannelId ? ` and channel ${calendarChannelId}` : ' (all pending channels)'}`);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const calendarChannels = await this.calendarChannelRepository.find({
                where: {
                    isSyncEnabled: true,
                    syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING,
                    ...(calendarChannelId ? { id: calendarChannelId } : {}),
                    workspaceId,
                },
            });
            if (calendarChannels.length === 0) {
                this.logger.warn('No calendar channels found with CALENDAR_EVENT_LIST_FETCH_PENDING status');
                return;
            }
            this.logger.log(`Found ${calendarChannels.length} calendar channel(s) to process`);
            for (const calendarChannel of calendarChannels) {
                await this.calendarChannelRepository.update({ id: calendarChannel.id, workspaceId }, {
                    syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_SCHEDULED,
                    syncStageStartedAt: new Date().toISOString(),
                });
                await this.messageQueueService.add(calendar_event_list_fetch_job_1.CalendarEventListFetchJob.name, {
                    calendarChannelId: calendarChannel.id,
                    workspaceId,
                });
                this.logger.log(`Triggered fetch for calendar channel ${calendarChannel.id}`);
            }
            this.logger.log(`Successfully triggered ${calendarChannels.length} calendar event list fetch job(s)`);
        }, authContext, { lite: true });
    }
    parseWorkspaceId(value) {
        return value;
    }
    parseCalendarChannelId(value) {
        return value;
    }
};
exports.CalendarTriggerEventListFetchCommand = CalendarTriggerEventListFetchCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-w, --workspace-id <workspace_id>',
        description: 'Workspace ID',
        required: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], CalendarTriggerEventListFetchCommand.prototype, "parseWorkspaceId", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-c, --calendar-channel-id [calendar_channel_id]',
        description: 'Calendar Channel ID (optional - if not provided, triggers for all pending channels)',
        required: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], CalendarTriggerEventListFetchCommand.prototype, "parseCalendarChannelId", null);
exports.CalendarTriggerEventListFetchCommand = CalendarTriggerEventListFetchCommand = CalendarTriggerEventListFetchCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'calendar:trigger-event-list-fetch',
        description: 'Trigger calendar event list fetch immediately without waiting for cron',
    }),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __param(2, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.calendarQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _b : Object])
], CalendarTriggerEventListFetchCommand);
