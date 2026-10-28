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
exports.MessagingMessageChannelSyncStatusMonitoringCronJob = exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN = void 0;
const lodash_snakecase_1 = __importDefault(require("lodash.snakecase"));
const workspace_1 = require("kovaa-lab-shared/workspace");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN = '2/10 * * * *'; //Every 10 minutes, starting at 2 minutes past the hour
let MessagingMessageChannelSyncStatusMonitoringCronJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var MessagingMessageChannelSyncStatusMonitoringCronJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(MessagingMessageChannelSyncStatusMonitoringCronJob.name), (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingMessageChannelSyncStatusMonitoringCronJob.name, exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageChannelSyncStatusMonitoringCronJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceRepository = __runInitializers(this, _instanceExtraInitializers);
        messagingMonitoringService;
        workspaceOrmManager;
        messageChannelRepository;
        exceptionHandlerService;
        constructor(workspaceRepository, messagingMonitoringService, workspaceOrmManager, messageChannelRepository, exceptionHandlerService) {
            this.workspaceRepository = workspaceRepository;
            this.messagingMonitoringService = messagingMonitoringService;
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageChannelRepository = messageChannelRepository;
            this.exceptionHandlerService = exceptionHandlerService;
        }
        async handle() {
            await this.messagingMonitoringService.track({
                eventName: 'message_channel.monitoring.sync_status.start',
                message: 'Starting message channel sync status monitoring',
            });
            const activeWorkspaces = await this.workspaceRepository.find({
                where: {
                    activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                },
            });
            for (const activeWorkspace of activeWorkspaces) {
                try {
                    const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(activeWorkspace.id);
                    await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                        const messageChannels = await this.messageChannelRepository.find({
                            select: ['id', 'syncStatus', 'connectedAccountId'],
                            where: { workspaceId: activeWorkspace.id },
                        });
                        for (const messageChannel of messageChannels) {
                            if (!messageChannel.syncStatus) {
                                continue;
                            }
                            await this.messagingMonitoringService.track({
                                eventName: `message_channel.monitoring.sync_status.${(0, lodash_snakecase_1.default)(messageChannel.syncStatus)}`,
                                workspaceId: activeWorkspace.id,
                                connectedAccountId: messageChannel.connectedAccountId,
                                messageChannelId: messageChannel.id,
                                message: messageChannel.syncStatus,
                            });
                        }
                    }, authContext, { lite: true });
                }
                catch (error) {
                    this.exceptionHandlerService.captureExceptions([error], {
                        workspace: {
                            id: activeWorkspace.id,
                        },
                    });
                }
            }
        }
    };
    return MessagingMessageChannelSyncStatusMonitoringCronJob = _classThis;
})();
exports.MessagingMessageChannelSyncStatusMonitoringCronJob = MessagingMessageChannelSyncStatusMonitoringCronJob;
