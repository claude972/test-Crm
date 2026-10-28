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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageCleanerMessageChannelListener = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const on_custom_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-custom-batch-event.decorator");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const message_channel_deleted_constant_1 = require("src/engine/metadata-modules/message-channel/constants/message-channel-deleted.constant");
const custom_workspace_batch_event_type_1 = require("src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type");
const messaging_message_channel_deletion_cleanup_job_1 = require("src/modules/messaging/message-cleaner/jobs/messaging-message-channel-deletion-cleanup.job");
let MessagingMessageCleanerMessageChannelListener = class MessagingMessageCleanerMessageChannelListener {
    messageQueueService;
    constructor(messageQueueService) {
        this.messageQueueService = messageQueueService;
    }
    async handleDeletedEvent(batchEvent) {
        const { workspaceId } = batchEvent;
        if (!(0, utils_1.isDefined)(workspaceId)) {
            return;
        }
        await Promise.all(batchEvent.events.map((event) => this.messageQueueService.add(messaging_message_channel_deletion_cleanup_job_1.MessagingMessageChannelDeletionCleanupJob.name, {
            workspaceId,
            messageChannelId: event.messageChannelId,
        })));
    }
};
exports.MessagingMessageCleanerMessageChannelListener = MessagingMessageCleanerMessageChannelListener;
__decorate([
    (0, on_custom_batch_event_decorator_1.OnCustomBatchEvent)(message_channel_deleted_constant_1.MESSAGE_CHANNEL_DELETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof custom_workspace_batch_event_type_1.CustomWorkspaceEventBatch !== "undefined" && custom_workspace_batch_event_type_1.CustomWorkspaceEventBatch) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], MessagingMessageCleanerMessageChannelListener.prototype, "handleDeletedEvent", null);
exports.MessagingMessageCleanerMessageChannelListener = MessagingMessageCleanerMessageChannelListener = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object])
], MessagingMessageCleanerMessageChannelListener);
