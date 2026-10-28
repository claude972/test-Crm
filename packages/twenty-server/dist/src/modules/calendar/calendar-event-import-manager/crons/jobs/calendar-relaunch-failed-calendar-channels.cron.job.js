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
exports.CalendarRelaunchFailedCalendarChannelsCronJob = exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const calendar_relaunch_failed_calendar_channel_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-relaunch-failed-calendar-channel.job");
exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN = '*/30 * * * *';
let CalendarRelaunchFailedCalendarChannelsCronJob = class CalendarRelaunchFailedCalendarChannelsCronJob {
    workspaceRepository;
    calendarChannelRepository;
    messageQueueService;
    exceptionHandlerService;
    constructor(workspaceRepository, calendarChannelRepository, messageQueueService, exceptionHandlerService) {
        this.workspaceRepository = workspaceRepository;
        this.calendarChannelRepository = calendarChannelRepository;
        this.messageQueueService = messageQueueService;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        const activeWorkspaces = await this.workspaceRepository.find({
            where: {
                activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
            },
        });
        const activeWorkspaceIds = activeWorkspaces.map((workspace) => workspace.id);
        if (activeWorkspaceIds.length === 0) {
            return;
        }
        const failedCalendarChannels = await this.calendarChannelRepository
            .find({
            where: {
                syncStage: types_1.CalendarChannelSyncStage.FAILED,
                syncStatus: types_1.CalendarChannelSyncStatus.FAILED_UNKNOWN,
                workspaceId: (0, typeorm_2.In)(activeWorkspaceIds),
            },
        })
            .catch((error) => {
            this.exceptionHandlerService.captureExceptions([error]);
            return [];
        });
        for (const calendarChannel of failedCalendarChannels) {
            try {
                await this.messageQueueService.add(calendar_relaunch_failed_calendar_channel_job_1.CalendarRelaunchFailedCalendarChannelJob.name, {
                    workspaceId: calendarChannel.workspaceId,
                    calendarChannelId: calendarChannel.id,
                });
            }
            catch (error) {
                this.exceptionHandlerService.captureExceptions([error], {
                    workspace: {
                        id: calendarChannel.workspaceId,
                    },
                });
            }
        }
    }
};
exports.CalendarRelaunchFailedCalendarChannelsCronJob = CalendarRelaunchFailedCalendarChannelsCronJob;
__decorate([
    (0, process_decorator_1.Process)(CalendarRelaunchFailedCalendarChannelsCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(CalendarRelaunchFailedCalendarChannelsCronJob.name, exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarRelaunchFailedCalendarChannelsCronJob.prototype, "handle", null);
exports.CalendarRelaunchFailedCalendarChannelsCronJob = CalendarRelaunchFailedCalendarChannelsCronJob = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __param(2, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.calendarQueue)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], CalendarRelaunchFailedCalendarChannelsCronJob);
