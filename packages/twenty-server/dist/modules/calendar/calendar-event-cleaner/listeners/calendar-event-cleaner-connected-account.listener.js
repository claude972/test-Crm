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
exports.CalendarEventCleanerConnectedAccountListener = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const on_custom_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-custom-batch-event.decorator");
const connected_account_deleted_constant_1 = require("src/engine/metadata-modules/connected-account/constants/connected-account-deleted.constant");
const delete_connected_account_associated_calendar_data_job_1 = require("src/modules/calendar/calendar-event-cleaner/jobs/delete-connected-account-associated-calendar-data.job");
let CalendarEventCleanerConnectedAccountListener = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleDeletedEvent_decorators;
    var CalendarEventCleanerConnectedAccountListener = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handleDeletedEvent_decorators = [(0, on_custom_batch_event_decorator_1.OnCustomBatchEvent)(connected_account_deleted_constant_1.CONNECTED_ACCOUNT_DELETED_EVENT)];
            __esDecorate(this, null, _handleDeletedEvent_decorators, { kind: "method", name: "handleDeletedEvent", static: false, private: false, access: { has: obj => "handleDeletedEvent" in obj, get: obj => obj.handleDeletedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventCleanerConnectedAccountListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        calendarQueueService = __runInitializers(this, _instanceExtraInitializers);
        constructor(calendarQueueService) {
            this.calendarQueueService = calendarQueueService;
        }
        async handleDeletedEvent(batchEvent) {
            const { workspaceId } = batchEvent;
            if (!(0, utils_1.isDefined)(workspaceId)) {
                return;
            }
            await Promise.all(batchEvent.events.map((event) => this.calendarQueueService.add(delete_connected_account_associated_calendar_data_job_1.DeleteConnectedAccountAssociatedCalendarDataJob.name, {
                workspaceId,
                connectedAccountId: event.connectedAccountId,
            })));
        }
    };
    return CalendarEventCleanerConnectedAccountListener = _classThis;
})();
exports.CalendarEventCleanerConnectedAccountListener = CalendarEventCleanerConnectedAccountListener;
