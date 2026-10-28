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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingBlocklistListener = void 0;
const common_1 = require("@nestjs/common");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const workspace_event_batch_type_1 = require("src/engine/workspace-event-emitter/types/workspace-event-batch.type");
const messaging_blocklist_item_delete_messages_job_1 = require("src/modules/messaging/blocklist-manager/jobs/messaging-blocklist-item-delete-messages.job");
const messaging_blocklist_reimport_messages_job_1 = require("src/modules/messaging/blocklist-manager/jobs/messaging-blocklist-reimport-messages.job");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
let MessagingBlocklistListener = class MessagingBlocklistListener {
    messageQueueService;
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
exports.MessagingBlocklistListener = MessagingBlocklistListener;
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], MessagingBlocklistListener.prototype, "handleCreatedEvent", null);
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.DELETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _c : Object]),
    __metadata("design:returntype", Promise)
], MessagingBlocklistListener.prototype, "handleDeletedEvent", null);
__decorate([
    (0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('blocklist', database_event_action_1.DatabaseEventAction.UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof workspace_event_batch_type_1.WorkspaceEventBatch !== "undefined" && workspace_event_batch_type_1.WorkspaceEventBatch) === "function" ? _d : Object]),
    __metadata("design:returntype", Promise)
], MessagingBlocklistListener.prototype, "handleUpdatedEvent", null);
exports.MessagingBlocklistListener = MessagingBlocklistListener = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object])
], MessagingBlocklistListener);
