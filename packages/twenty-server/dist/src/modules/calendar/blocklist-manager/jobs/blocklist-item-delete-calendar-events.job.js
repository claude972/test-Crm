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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlocklistItemDeleteCalendarEventsJob = void 0;
const common_1 = require("@nestjs/common");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const calendar_event_cleaner_service_1 = require("src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service");
let BlocklistItemDeleteCalendarEventsJob = class BlocklistItemDeleteCalendarEventsJob {
    calendarEventCleanerService;
    constructor(calendarEventCleanerService) {
        this.calendarEventCleanerService = calendarEventCleanerService;
    }
    async handle(data) {
        // Blocking a handle deletes their messages but deliberately leaves calendar
        // events alone: an event the blocked handle merely attended is still the
        // workspace's own meeting, so it is not swept up with them. We only clean up
        // events that were orphaned by other means.
        await this.calendarEventCleanerService.cleanWorkspaceCalendarEvents(data.workspaceId);
    }
};
exports.BlocklistItemDeleteCalendarEventsJob = BlocklistItemDeleteCalendarEventsJob;
__decorate([
    (0, process_decorator_1.Process)(BlocklistItemDeleteCalendarEventsJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof BlocklistItemDeleteCalendarEventsJobData !== "undefined" && BlocklistItemDeleteCalendarEventsJobData) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], BlocklistItemDeleteCalendarEventsJob.prototype, "handle", null);
exports.BlocklistItemDeleteCalendarEventsJob = BlocklistItemDeleteCalendarEventsJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.calendarQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __metadata("design:paramtypes", [calendar_event_cleaner_service_1.CalendarEventCleanerService])
], BlocklistItemDeleteCalendarEventsJob);
