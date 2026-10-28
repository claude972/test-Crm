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
exports.CalendarRelaunchFailedCalendarChannelsCronJob = exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN = void 0;
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const calendar_relaunch_failed_calendar_channel_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-relaunch-failed-calendar-channel.job");
exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN = '*/30 * * * *';
let CalendarRelaunchFailedCalendarChannelsCronJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var CalendarRelaunchFailedCalendarChannelsCronJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(CalendarRelaunchFailedCalendarChannelsCronJob.name), (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(CalendarRelaunchFailedCalendarChannelsCronJob.name, exports.CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarRelaunchFailedCalendarChannelsCronJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceRepository = __runInitializers(this, _instanceExtraInitializers);
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
                    workspaceId: (0, typeorm_1.In)(activeWorkspaceIds),
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
    return CalendarRelaunchFailedCalendarChannelsCronJob = _classThis;
})();
exports.CalendarRelaunchFailedCalendarChannelsCronJob = CalendarRelaunchFailedCalendarChannelsCronJob;
