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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CalendarEventsImportCronJob_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventsImportCronJob = exports.CALENDAR_EVENTS_IMPORT_CRON_PATTERN = void 0;
const lodash_groupby_1 = __importDefault(require("lodash.groupby"));
const common_1 = require("@nestjs/common");
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
const calendar_events_import_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-events-import.job");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const is_throttled_1 = require("src/modules/connected-account/utils/is-throttled");
const toIsoStringOrNull_1 = require("src/utils/date/toIsoStringOrNull");
exports.CALENDAR_EVENTS_IMPORT_CRON_PATTERN = '*/1 * * * *';
let CalendarEventsImportCronJob = CalendarEventsImportCronJob_1 = class CalendarEventsImportCronJob {
    messageQueueService;
    calendarChannelRepository;
    exceptionHandlerService;
    logger = new common_1.Logger(CalendarEventsImportCronJob_1.name);
    constructor(messageQueueService, calendarChannelRepository, exceptionHandlerService) {
        this.messageQueueService = messageQueueService;
        this.calendarChannelRepository = calendarChannelRepository;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        const pendingCalendarChannelsAcrossWorkspaces = await this.calendarChannelRepository.find({
            where: {
                isSyncEnabled: true,
                syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_PENDING,
                workspace: {
                    activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                    deletedAt: (0, typeorm_2.IsNull)(),
                },
            },
        });
        const pendingCalendarChannelsByWorkspaceId = (0, lodash_groupby_1.default)(pendingCalendarChannelsAcrossWorkspaces, 'workspaceId');
        for (const [workspaceId, pendingCalendarChannels] of Object.entries(pendingCalendarChannelsByWorkspaceId)) {
            try {
                const calendarChannelsToSchedule = pendingCalendarChannels.filter((calendarChannel) => !(0, is_throttled_1.isThrottled)((0, toIsoStringOrNull_1.toIsoStringOrNull)(calendarChannel.syncStageStartedAt), calendarChannel.throttleFailureCount));
                const throttledCount = pendingCalendarChannels.length - calendarChannelsToSchedule.length;
                if (throttledCount > 0) {
                    this.logger.log(`Skipped ${throttledCount} throttled calendar channels for workspace ${workspaceId}`);
                }
                if (calendarChannelsToSchedule.length === 0) {
                    continue;
                }
                const calendarChannelIds = calendarChannelsToSchedule.map((calendarChannel) => calendarChannel.id);
                const updateResult = await this.calendarChannelRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                    syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_SCHEDULED,
                    syncStageStartedAt: new Date(),
                })
                    .where({
                    id: (0, typeorm_2.In)(calendarChannelIds),
                    workspaceId,
                    isSyncEnabled: true,
                    syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENTS_IMPORT_PENDING,
                })
                    .returning('id')
                    .execute();
                const updatedIds = updateResult.raw.map((row) => row.id);
                for (const calendarChannelId of updatedIds) {
                    await this.messageQueueService.add(calendar_events_import_job_1.CalendarEventsImportJob.name, {
                        calendarChannelId,
                        workspaceId,
                    });
                }
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
};
exports.CalendarEventsImportCronJob = CalendarEventsImportCronJob;
__decorate([
    (0, process_decorator_1.Process)(CalendarEventsImportCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(CalendarEventsImportCronJob.name, exports.CALENDAR_EVENTS_IMPORT_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CalendarEventsImportCronJob.prototype, "handle", null);
exports.CalendarEventsImportCronJob = CalendarEventsImportCronJob = CalendarEventsImportCronJob_1 = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.cronQueue,
    }),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.calendarQueue)),
    __param(1, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], CalendarEventsImportCronJob);
