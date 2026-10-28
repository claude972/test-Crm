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
exports.MessagingBlocklistListener = void 0;
const common_1 = require("@nestjs/common");
const messaging_blocklist_item_delete_messages_job_1 = require("src/modules/messaging/blocklist-manager/jobs/messaging-blocklist-item-delete-messages.job");
const messaging_blocklist_reimport_messages_job_1 = require("src/modules/messaging/blocklist-manager/jobs/messaging-blocklist-reimport-messages.job");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
let MessagingBlocklistListener = (() => {
    let _classDecorators = [(0, common_1.Injectable)({ scope: common_1.Scope.REQUEST })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleCreatedEvent_decorators;
    let _handleDeletedEvent_decorators;
    let _handleUpdatedEvent_decorators;
    var MessagingBlocklistListener = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handleCreatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.CREATED)];
            _handleDeletedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.DELETED)];
            _handleUpdatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.UPDATED)];
            __esDecorate(this, null, _handleCreatedEvent_decorators, { kind: "method", name: "handleCreatedEvent", static: false, private: false, access: { has: obj => "handleCreatedEvent" in obj, get: obj => obj.handleCreatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleDeletedEvent_decorators, { kind: "method", name: "handleDeletedEvent", static: false, private: false, access: { has: obj => "handleDeletedEvent" in obj, get: obj => obj.handleDeletedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleUpdatedEvent_decorators, { kind: "method", name: "handleUpdatedEvent", static: false, private: false, access: { has: obj => "handleUpdatedEvent" in obj, get: obj => obj.handleUpdatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingBlocklistListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageQueueService = __runInitializers(this, _instanceExtraInitializers);
        constructor(messageQueueService) {
            this.messageQueueService = messageQueueService;
        }
        async handleCreatedEvent(payload) {
            await this.messageQueueService.add(messaging_blocklist_item_delete_messages_job_1.BlocklistItemDeleteMessagesJob.name, payload);
        }
        async handleDeletedEvent(payload) {
            await this.messageQueueService.add(messaging_blocklist_reimport_messages_job_1.BlocklistReimportMessagesJob.name, payload);
        }
        async handleUpdatedEvent(payload) {
            await this.messageQueueService.add(messaging_blocklist_item_delete_messages_job_1.BlocklistItemDeleteMessagesJob.name, payload);
            await this.messageQueueService.add(messaging_blocklist_reimport_messages_job_1.BlocklistReimportMessagesJob.name, payload);
        }
    };
    return MessagingBlocklistListener = _classThis;
})();
exports.MessagingBlocklistListener = MessagingBlocklistListener;
