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
exports.CalendarOngoingStaleJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const calendar_ongoing_stale_sync_stages_constant_1 = require("src/modules/calendar/calendar-event-import-manager/constants/calendar-ongoing-stale-sync-stages.constant");
const is_sync_stale_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/is-sync-stale.util");
let CalendarOngoingStaleJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)({
            queueName: message_queue_constants_1.MessageQueue.calendarQueue,
            scope: common_1.Scope.REQUEST,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var CalendarOngoingStaleJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(CalendarOngoingStaleJob.name)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarOngoingStaleJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager = __runInitializers(this, _instanceExtraInitializers);
        calendarChannelRepository;
        calendarChannelSyncStatusService;
        logger = new common_1.Logger(CalendarOngoingStaleJob.name);
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
                        syncStage: (0, typeorm_1.In)(calendar_ongoing_stale_sync_stages_constant_1.CALENDAR_ONGOING_STALE_SYNC_STAGES),
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
    return CalendarOngoingStaleJob = _classThis;
})();
exports.CalendarOngoingStaleJob = CalendarOngoingStaleJob;
