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
exports.MessagingOngoingStaleCronJob = exports.MESSAGING_ONGOING_STALE_CRON_PATTERN = void 0;
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_1 = require("typeorm");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const messaging_import_ongoing_sync_timeout_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-import-ongoing-sync-timeout.constant");
const messaging_ongoing_stale_sync_stages_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-ongoing-stale-sync-stages.constant");
const messaging_ongoing_stale_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-ongoing-stale.job");
exports.MESSAGING_ONGOING_STALE_CRON_PATTERN = '0 * * * *';
let MessagingOngoingStaleCronJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var MessagingOngoingStaleCronJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(MessagingOngoingStaleCronJob.name), (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingOngoingStaleCronJob.name, exports.MESSAGING_ONGOING_STALE_CRON_PATTERN)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingOngoingStaleCronJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageChannelRepository = __runInitializers(this, _instanceExtraInitializers);
        messageQueueService;
        exceptionHandlerService;
        constructor(messageChannelRepository, messageQueueService, exceptionHandlerService) {
            this.messageChannelRepository = messageChannelRepository;
            this.messageQueueService = messageQueueService;
            this.exceptionHandlerService = exceptionHandlerService;
        }
        async handle() {
            const staleWorkspaceIds = await this.findStaleWorkspaceIds();
            for (const workspaceId of staleWorkspaceIds) {
                try {
                    await this.messageQueueService.add(messaging_ongoing_stale_job_1.MessagingOngoingStaleJob.name, {
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
            const staleBefore = new Date(Date.now() - messaging_import_ongoing_sync_timeout_constant_1.MESSAGING_IMPORT_ONGOING_SYNC_TIMEOUT);
            const staleChannels = await this.messageChannelRepository.find({
                select: {
                    workspaceId: true,
                },
                where: {
                    syncStage: (0, typeorm_1.In)(messaging_ongoing_stale_sync_stages_constant_1.MESSAGING_ONGOING_STALE_SYNC_STAGES),
                    syncStageStartedAt: (0, typeorm_1.Or)((0, typeorm_1.IsNull)(), (0, typeorm_1.LessThan)(staleBefore)),
                    workspace: {
                        deletedAt: (0, typeorm_1.IsNull)(),
                        activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                    },
                },
            });
            return [...new Set(staleChannels.map(({ workspaceId }) => workspaceId))];
        }
    };
    return MessagingOngoingStaleCronJob = _classThis;
})();
exports.MessagingOngoingStaleCronJob = MessagingOngoingStaleCronJob;
