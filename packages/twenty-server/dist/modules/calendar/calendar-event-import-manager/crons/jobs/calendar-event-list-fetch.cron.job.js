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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventListFetchCronJob = exports.CALENDAR_EVENT_LIST_FETCH_CRON_PATTERN = void 0;
const lodash_groupby_1 = __importDefault(require("lodash.groupby"));
const common_1 = require("@nestjs/common");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const calendar_event_list_fetch_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-event-list-fetch.job");
const is_last_successful_sync_stale_util_1 = require("src/modules/connected-account/utils/is-last-successful-sync-stale.util");
const is_throttled_1 = require("src/modules/connected-account/utils/is-throttled");
const toIsoStringOrNull_1 = require("src/utils/date/toIsoStringOrNull");
exports.CALENDAR_EVENT_LIST_FETCH_CRON_PATTERN = '*/5 * * * *';
let CalendarEventListFetchCronJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)({
            queueName: message_queue_constants_1.MessageQueue.cronQueue,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var CalendarEventListFetchCronJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(CalendarEventListFetchCronJob.name), (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(CalendarEventListFetchCronJob.name, exports.CALENDAR_EVENT_LIST_FETCH_CRON_PATTERN)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventListFetchCronJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageQueueService = __runInitializers(this, _instanceExtraInitializers);
        exceptionHandlerService;
        calendarChannelRepository;
        logger = new common_1.Logger(CalendarEventListFetchCronJob.name);
        constructor(messageQueueService, exceptionHandlerService, calendarChannelRepository) {
            this.messageQueueService = messageQueueService;
            this.exceptionHandlerService = exceptionHandlerService;
            this.calendarChannelRepository = calendarChannelRepository;
        }
        async handle() {
            const pendingCalendarChannelsAcrossWorkspaces = await this.calendarChannelRepository.find({
                where: {
                    isSyncEnabled: true,
                    syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING,
                    workspace: {
                        activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                        deletedAt: (0, typeorm_1.IsNull)(),
                    },
                },
            });
            const pendingCalendarChannelsByWorkspaceId = (0, lodash_groupby_1.default)(pendingCalendarChannelsAcrossWorkspaces, 'workspaceId');
            for (const [workspaceId, pendingCalendarChannels] of Object.entries(pendingCalendarChannelsByWorkspaceId)) {
                try {
                    const calendarChannelsToSchedule = pendingCalendarChannels.filter((calendarChannel) => !(0, is_throttled_1.isThrottled)((0, toIsoStringOrNull_1.toIsoStringOrNull)(calendarChannel.syncStageStartedAt), calendarChannel.throttleFailureCount) &&
                        (calendarChannel.webhookSubscriptionStatus !==
                            types_1.WebhookSubscriptionStatus.ACTIVE ||
                            (0, is_last_successful_sync_stale_util_1.isLastSuccessfulSyncStale)((0, toIsoStringOrNull_1.toIsoStringOrNull)(calendarChannel.syncedAt))));
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
                        syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_SCHEDULED,
                        syncStageStartedAt: new Date(),
                    })
                        .where({
                        id: (0, typeorm_1.In)(calendarChannelIds),
                        workspaceId,
                        isSyncEnabled: true,
                        syncStage: types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING,
                    })
                        .returning('id')
                        .execute();
                    const updatedIds = updateResult.raw.map((row) => row.id);
                    for (const calendarChannelId of updatedIds) {
                        await this.messageQueueService.add(calendar_event_list_fetch_job_1.CalendarEventListFetchJob.name, {
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
    return CalendarEventListFetchCronJob = _classThis;
})();
exports.CalendarEventListFetchCronJob = CalendarEventListFetchCronJob;
