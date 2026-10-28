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
exports.MessageParticipantPersonListener = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const on_database_batch_event_decorator_1 = require("src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator");
const database_event_action_1 = require("src/engine/api/graphql/graphql-query-runner/enums/database-event-action");
const object_record_changed_properties_util_1 = require("src/engine/core-modules/event-emitter/utils/object-record-changed-properties.util");
const get_changed_person_handles_util_1 = require("src/modules/match-participant/person-handle-field/utils/get-changed-person-handles.util");
const get_person_emails_util_1 = require("src/modules/match-participant/utils/get-person-emails.util");
const message_participant_match_participant_job_1 = require("src/modules/messaging/message-participant-manager/jobs/message-participant-match-participant.job");
let MessageParticipantPersonListener = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleCreatedEvent_decorators;
    let _handleUpdatedEvent_decorators;
    let _handleDestroyedEvent_decorators;
    var MessageParticipantPersonListener = class {
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
            MessageParticipantPersonListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageQueueService = __runInitializers(this, _instanceExtraInitializers);
        messageChannelRepository;
        personHandleFieldService;
        constructor(messageQueueService, messageChannelRepository, personHandleFieldService) {
            this.messageQueueService = messageQueueService;
            this.messageChannelRepository = messageChannelRepository;
            this.personHandleFieldService = personHandleFieldService;
        }
        async handleCreatedEvent(payload) {
            const personWithEmails = payload.events.filter((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails).length > 0);
            const personHandleMatching = await this.buildPersonHandleMatching({
                workspaceId: payload.workspaceId,
                personChanges: payload.events.map((eventPayload) => ({
                    personId: eventPayload.recordId,
                    before: null,
                    after: eventPayload.properties.after,
                })),
            });
            await this.enqueueMatching({
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails: personWithEmails.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.after.emails)),
                    workspaceMemberIds: [],
                },
                personHandleMatching,
            });
        }
        async handleUpdatedEvent(payload) {
            const personChanges = payload.events.map((eventPayload) => ({
                personId: eventPayload.recordId,
                before: eventPayload.properties.before,
                after: eventPayload.properties.after,
                changedFieldNames: (0, object_record_changed_properties_util_1.objectRecordChangedProperties)(eventPayload.properties.before, eventPayload.properties.after),
            }));
            const personHandleMatching = await this.buildPersonHandleMatching({
                workspaceId: payload.workspaceId,
                personChanges,
            });
            await this.enqueueMatching({
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails: personChanges
                        .filter(({ changedFieldNames }) => changedFieldNames.includes('emails'))
                        .flatMap(({ before, after }) => [
                        ...(0, get_person_emails_util_1.getPersonEmails)(before.emails),
                        ...(0, get_person_emails_util_1.getPersonEmails)(after.emails),
                    ]),
                    workspaceMemberIds: [],
                },
                personHandleMatching,
            });
        }
        async enqueueMatching(data) {
            if (data.participantMatching.personEmails.length === 0 &&
                (data.personHandleMatching ?? []).length === 0) {
                return;
            }
            await this.messageQueueService.add(message_participant_match_participant_job_1.MessageParticipantMatchParticipantJob.name, data);
        }
        async buildPersonHandleMatching({ workspaceId, personChanges, }) {
            const changedHandlesByFieldUniversalIdentifier = new Map();
            for (const personHandleField of await this.personHandleFieldService.findAll(workspaceId)) {
                const changedHandles = (0, get_changed_person_handles_util_1.getChangedPersonHandles)({
                    personHandleField,
                    personChanges: personChanges.filter(({ changedFieldNames }) => !(0, utils_1.isDefined)(changedFieldNames) ||
                        changedFieldNames.includes(personHandleField.name)),
                });
                if (changedHandles.handles.length > 0) {
                    changedHandlesByFieldUniversalIdentifier.set(personHandleField.universalIdentifier, changedHandles);
                }
            }
            // most person writes stop here, before any channel lookup
            if (changedHandlesByFieldUniversalIdentifier.size === 0) {
                return [];
            }
            const messageChannels = await this.messageChannelRepository.find({
                where: {
                    workspaceId,
                    type: types_1.MessageChannelType.APP,
                    participantHandleFieldUniversalIdentifier: (0, typeorm_1.In)([
                        ...changedHandlesByFieldUniversalIdentifier.keys(),
                    ]),
                },
                select: { id: true, participantHandleFieldUniversalIdentifier: true },
            });
            return [...changedHandlesByFieldUniversalIdentifier].flatMap(([fieldUniversalIdentifier, { handles, changedPersonIds }]) => {
                const messageChannelIds = messageChannels
                    .filter((messageChannel) => messageChannel.participantHandleFieldUniversalIdentifier ===
                    fieldUniversalIdentifier)
                    .map((messageChannel) => messageChannel.id);
                if (messageChannelIds.length === 0) {
                    return [];
                }
                return [
                    {
                        fieldUniversalIdentifier,
                        messageChannelIds,
                        handles,
                        changedPersonIds,
                    },
                ];
            });
        }
        async handleDestroyedEvent(payload) {
            const personHandleMatching = await this.buildPersonHandleMatching({
                workspaceId: payload.workspaceId,
                personChanges: payload.events.map((eventPayload) => ({
                    personId: eventPayload.recordId,
                    before: eventPayload.properties.before,
                    after: null,
                })),
            });
            await this.enqueueMatching({
                workspaceId: payload.workspaceId,
                participantMatching: {
                    personEmails: payload.events.flatMap((eventPayload) => (0, get_person_emails_util_1.getPersonEmails)(eventPayload.properties.before.emails)),
                    workspaceMemberIds: [],
                },
                personHandleMatching,
            });
        }
    };
    return MessageParticipantPersonListener = _classThis;
})();
exports.MessageParticipantPersonListener = MessageParticipantPersonListener;
