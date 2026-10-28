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
exports.CalendarOngoingStaleCronJob = exports.CALENDAR_ONGOING_STALE_CRON_PATTERN = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const calendar_import_ongoing_sync_timeout_constant_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-import-ongoing-sync-timeout.constant");
const calendar_ongoing_stale_sync_stages_constant_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-ongoing-stale-sync-stages.constant");
const calendar_ongoing_stale_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-ongoing-stale.job");
exports.CALENDAR_ONGOING_STALE_CRON_PATTERN = '0 * * * *';
let CalendarOngoingStaleCronJob = class CalendarOngoingStaleCronJob {
    calendarChannelRepository;
    messageQueueService;
    exceptionHandlerService;
    constructor(calendarChannelRepository, messageQueueService, exceptionHandlerService) {
        this.calendarChannelRepository = calendarChannelRepository;
        this.messageQueueService = messageQueueService;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        const staleWorkspaceIds = await this.findStaleWorkspaceIds();
        for (const workspaceId of staleWorkspaceIds) {
            try {
                await this.messageQueueService.add(calendar_ongoing_stale_job_1.CalendarOngoingStaleJob.name, {
                    workspaceId,
                });
            }
            catch (error) {
                this.exceptionHandlerService.captureExceptions([error], {
                    workspace: {
                        id: workspaceId,
                    },
                });
            }
        }
    }
    async findStaleWorkspaceIds() {
        const staleBefore = new Date(Date.now() - calendar_import_ongoing_sync_timeout_constant_1.CALENDAR_IMPORT_ONGOING_SYNC_TIMEOUT);
        const staleChannels = await this.calendarChannelRepository.find({
            select: {
                workspaceId: true,
            },
            where: {
                syncStage: (0, typeorm_2.In)(calendar_ongoing_stale_sync_stages_constant_1.CALENDAR_ONGOING_STALE_SYNC_STAGES),
                syncStageStartedAt: (0, typeorm_2.Or)((0, typeorm_2.IsNull)(), (0, typeorm_2.LessThan)(staleBefore)),
                workspace: {
                    deletedAt: (0, typeorm_2.IsNull)(),
                    activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                },
            },
        });
        return [...new Set(staleChannels.map(({ workspaceId }) => workspaceId))];
    }
};
exports.CalendarOngoingStaleCronJob = CalendarOngoingStaleCronJob;
__decorate([
    (0, process_decorator_1.Process)(CalendarOngoingStaleCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(CalendarOngoingStaleCronJob.name, exports.CALENDAR_ONGOING_STALE_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarOngoingStaleCronJob.prototype, "handle", null);
exports.CalendarOngoingStaleCronJob = CalendarOngoingStaleCronJob = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __param(1, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.calendarQueue)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], CalendarOngoingStaleCronJob);
