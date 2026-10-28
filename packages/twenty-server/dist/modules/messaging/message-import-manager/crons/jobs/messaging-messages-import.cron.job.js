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
exports.MessagingMessagesImportCronJob = exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN = void 0;
const lodash_groupby_1 = __importDefault(require("lodash.groupby"));
const common_1 = require("@nestjs/common");
const constants_1 = require("kovaa-lab-shared/constants");
const utils_1 = require("kovaa-lab-shared/utils");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const messaging_messages_import_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-messages-import.job");
const is_throttled_1 = require("src/modules/connected-account/utils/is-throttled");
const toIsoStringOrNull_1 = require("src/utils/date/toIsoStringOrNull");
exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN = '*/1 * * * *';
let MessagingMessagesImportCronJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var MessagingMessagesImportCronJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(MessagingMessagesImportCronJob.name), (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingMessagesImportCronJob.name, exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessagesImportCronJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceRepository = __runInitializers(this, _instanceExtraInitializers);
        messageQueueService;
        exceptionHandlerService;
        messageChannelRepository;
        logger = new common_1.Logger(MessagingMessagesImportCronJob.name);
        constructor(workspaceRepository, messageQueueService, exceptionHandlerService, messageChannelRepository) {
            this.workspaceRepository = workspaceRepository;
            this.messageQueueService = messageQueueService;
            this.exceptionHandlerService = exceptionHandlerService;
            this.messageChannelRepository = messageChannelRepository;
        }
        async handle() {
            const pendingMessageChannelsAcrossWorkspaces = await this.messageChannelRepository.find({
                where: {
                    isSyncEnabled: true,
                    syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_PENDING,
                    type: (0, typeorm_1.In)([...constants_1.POLLED_MESSAGE_CHANNEL_TYPES]),
                    workspace: {
                        activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                        deletedAt: (0, typeorm_1.IsNull)(),
                    },
                },
            });
            const pendingMessageChannelsByWorkspaceId = (0, lodash_groupby_1.default)(pendingMessageChannelsAcrossWorkspaces, 'workspaceId');
            for (const [workspaceId, pendingMessageChannels] of Object.entries(pendingMessageChannelsByWorkspaceId)) {
                try {
                    const messageChannelsToSchedule = pendingMessageChannels.filter((messageChannel) => !(0, is_throttled_1.isThrottled)((0, toIsoStringOrNull_1.toIsoStringOrNull)(messageChannel.syncStageStartedAt), messageChannel.throttleFailureCount, (0, toIsoStringOrNull_1.toIsoStringOrNull)(messageChannel.throttleRetryAfter)));
                    const throttledCount = pendingMessageChannels.length - messageChannelsToSchedule.length;
                    if (throttledCount > 0) {
                        this.logger.log(`Skipped ${throttledCount} throttled message channels for workspace ${workspaceId}`);
                    }
                    if (messageChannelsToSchedule.length === 0) {
                        continue;
                    }
                    const messageChannelIdsToSchedule = messageChannelsToSchedule.map((messageChannel) => messageChannel.id);
                    const updateResult = await this.messageChannelRepository
                        .createQueryBuilder()
                        .update()
                        .set({
                        syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED,
                        syncStageStartedAt: new Date(),
                    })
                        .where({
                        id: (0, typeorm_1.In)(messageChannelIdsToSchedule),
                        workspaceId,
                        isSyncEnabled: true,
                        syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_PENDING,
                    })
                        .returning('id')
                        .execute();
                    const updatedIds = updateResult.raw.map((row) => row.id);
                    for (const messageChannelId of updatedIds) {
                        await this.messageQueueService.add(messaging_messages_import_job_1.MessagingMessagesImportJob.name, {
                            workspaceId,
                            messageChannelId,
                        });
                    }
                }
                catch (error) {
                    if (error.code === '42P01' &&
                        error.message.includes('messageChannel" does not exist')) {
                        const refetchedWorkspace = await this.workspaceRepository.findOneBy({
                            id: workspaceId,
                        });
                        if ((0, utils_1.isDefined)(refetchedWorkspace)) {
                            this.exceptionHandlerService.captureExceptions([error], {
                                workspace: {
                                    id: workspaceId,
                                },
                            });
                            throw new Error('Workspace schema not found while the workspace is still active');
                        }
                    }
                    else {
                        this.exceptionHandlerService.captureExceptions([error], {
                            workspace: {
                                id: workspaceId,
                            },
                        });
                    }
                }
            }
        }
    };
    return MessagingMessagesImportCronJob = _classThis;
})();
exports.MessagingMessagesImportCronJob = MessagingMessagesImportCronJob;
