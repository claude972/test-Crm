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
exports.CalendarEventParticipantPersonListener = void 0;
const common_1 = require("@nestjs/common");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
const object_record_changed_properties_util_1 = require("src/engine/core-modules/event-emitter/utils/object-record-changed-properties.util");
const calendar_event_participant_match_participant_job_1 = require("src/modules/calendar/calendar-event-participant-manager/jobs/calendar-event-participant-match-participant.job");
const get_person_emails_util_1 = require("src/modules/match-participant/utils/get-person-emails.util");
let CalendarEventParticipantPersonListener = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleCreatedEvent_decorators;
    let _handleUpdatedEvent_decorators;
    let _handleDestroyedEvent_decorators;
    var CalendarEventParticipantPersonListener = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handleCreatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.CREATED)];
            _handleUpdatedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.UPDATED)];
            _handleDestroyedEvent_decorators = [(0, on_database_batch_event_decorator_1.OnDatabaseBatchEvent)('person', database_event_action_1.DatabaseEventAction.DESTROYED)];
            __esDecorate(this, null, _handleCreatedEvent_decorators, { kind: "method", name: "handleCreatedEvent", static: false, private: false, access: { has: obj => "handleCreatedEvent" in obj, get: obj => obj.handleCreatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleUpdatedEvent_decorators, { kind: "method", name: "handleUpdatedEvent", static: false, private: false, access: { has: obj => "handleUpdatedEvent" in obj, get: obj => obj.handleUpdatedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleDestroyedEvent_decorators, { kind: "method", name: "handleDestroyedEvent", static: false, private: false, access: { has: obj => "handleDestroyedEvent" in obj, get: obj => obj.handleDestroyedEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventParticipantPersonListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageQueueService = __runInitializers(this, _instanceExtraInitializers);
        constructor(messageQueueService) {
            this.messageQueueService = messageQueueService;
        }
        async handleCreatedEvent(payload) {
            const personWithEmails = payload.events.filter((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails).length > 0);
            if (personWithEmails.length === 0) {
                return;
            }
            const personEmails = personWithEmails.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails));
            await this.messageQueueService.add(calendar_event_participant_match_participant_job_1.CalendarEventParticipantMatchParticipantJob.name, {
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails,
                    workspaceMemberIds: [],
                },
            });
        }
        async handleUpdatedEvent(payload) {
            const personWithUpdatedEmails = payload.events.filter((eventPayload) => (0, object_record_changed_properties_util_1.objectRecordChangedProperties)(eventPayload.properties.before, eventPayload.properties.after).includes('emails'));
            if (personWithUpdatedEmails.length === 0) {
                return;
            }
            const personEmails = personWithUpdatedEmails.flatMap((eventPayload) => [
                ...(0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.before.emails),
                ...(0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails),
            ]);
            await this.messageQueueService.add(calendar_event_participant_match_participant_job_1.CalendarEventParticipantMatchParticipantJob.name, {
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails,
                    workspaceMemberIds: [],
                },
            });
        }
        async handleDestroyedEvent(payload) {
            const personEmails = payload.events.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.before.emails));
            if (personEmails.length === 0) {
                return;
            }
            await this.messageQueueService.add(calendar_event_participant_match_participant_job_1.CalendarEventParticipantMatchParticipantJob.name, {
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails,
                    workspaceMemberIds: [],
                },
            });
        }
    };
    return CalendarEventParticipantPersonListener = _classThis;
})();
exports.CalendarEventParticipantPersonListener = CalendarEventParticipantPersonListener;
