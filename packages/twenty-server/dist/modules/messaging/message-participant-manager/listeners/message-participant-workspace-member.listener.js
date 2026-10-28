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
exports.MessageParticipantWorkspaceMemberListener = void 0;
const common_1 = require("@nestjs/common");
const workspace_1 = require("kovaa-lab-shared/workspace");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
const object_record_changed_properties_util_1 = require("src/engine/core-modules/event-emitter/utils/object-record-changed-properties.util");
const message_participant_match_participant_job_1 = require("src/modules/messaging/message-participant-manager/jobs/message-participant-match-participant.job");
let MessageParticipantWorkspaceMemberListener = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleCreatedEvent_decorators;
    let _handleUpdatedEvent_decorators;
    var MessageParticipantWorkspaceMemberListener = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handleCreatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('workspaceMember', database_event_action_1.DatabaseEventAction.CREATED)];
            _handleUpdatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('workspaceMember', database_event_action_1.DatabaseEventAction.UPDATED)];
            __esDecorate(this, null, _handleCreatedEvent_decorators, { kind: "method", name: "handleCreatedEvent", static: false, private: false, access: { has: obj => "handleCreatedEvent" in obj, get: obj => obj.handleCreatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleUpdatedEvent_decorators, { kind: "method", name: "handleUpdatedEvent", static: false, private: false, access: { has: obj => "handleUpdatedEvent" in obj, get: obj => obj.handleUpdatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessageParticipantWorkspaceMemberListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageQueueService = __runInitializers(this, _instanceExtraInitializers);
        workspaceRepository;
        constructor(messageQueueService, workspaceRepository) {
            this.messageQueueService = messageQueueService;
            this.workspaceRepository = workspaceRepository;
        }
        async handleCreatedEvent(payload) {
            const workspace = await this.workspaceRepository.findOneBy({
                id: payload.workspaceId,
            });
            if (!workspace ||
                workspace.activationStatus !== workspace_1.WorkspaceActivationStatus.ACTIVE) {
                return;
            }
            for (const eventPayload of payload.events) {
                if (!eventPayload.properties.after.userEmail) {
                    continue;
                }
                await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, {
                    workspaceId: payload.workspaceId,
                    participantMatching: {
                        personEmails: [],
                        workspaceMemberIds: [eventPayload.recordId],
                    },
                });
            }
        }
        async handleUpdatedEvent(payload) {
            for (const eventPayload of payload.events) {
                if ((0, object_record_changed_properties_util_1.objectRecordChangedProperties)(eventPayload.properties.before, eventPayload.properties.after).includes('userEmail')) {
                    await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, {
                        workspaceId: payload.workspaceId,
                        participantMatching: {
                            personEmails: [],
                            workspaceMemberIds: [eventPayload.recordId],
                        },
                    });
                }
            }
        }
    };
    return MessageParticipantWorkspaceMemberListener = _classThis;
})();
exports.MessageParticipantWorkspaceMemberListener = MessageParticipantWorkspaceMemberListener;
