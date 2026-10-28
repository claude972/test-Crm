"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingMessageService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        logger = new common_1.Logger(MessagingMessageService.name);
        constructor(workspaceOrmManager) {
            this.workspaceOrmManager = workspaceOrmManager;
        }
        async saveMessagesWithinTransaction(messages, messageChannelId, transactionScope, workspaceId) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const messageChannelMessageAssociationRepository = transactionScope.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                const messageRepository = transactionScope.getRepository('message', {
                    shouldBypassPermissionChecks: true,
                });
                const messageThreadRepository = transactionScope.getRepository('messageThread', { shouldBypassPermissionChecks: true });
                const messageAccumulatorMap = new Map();
                const existingMessagesInDB = await messageRepository.find({
                    where: {
                        headerMessageId: (0, typeorm_1.In)(messages.map((message) => message.headerMessageId)),
                    },
                });
                const messageChannelMessageAssociationsReferencingMessageThread = await messageChannelMessageAssociationRepository.find({
                    where: {
                        messageThreadExternalId: (0, typeorm_1.In)(messages.map((message) => message.messageThreadExternalId)),
                        messageChannelId,
                    },
                    relations: { message: true },
                });
                const existingMessageChannelMessageAssociations = await messageChannelMessageAssociationRepository.find({
                    where: {
                        messageId: (0, typeorm_1.In)(existingMessagesInDB.map((message) => message.id)),
                        messageChannelId,
                    },
                });
                await this.enrichMessageAccumulatorWithExistingMessages(messages, messageAccumulatorMap, existingMessagesInDB, messageChannelMessageAssociationsReferencingMessageThread);
                await this.enrichMessageAccumulatorWithExistingMessageThreadIds(messages, messageAccumulatorMap, messageChannelMessageAssociationsReferencingMessageThread, workspaceId);
                await this.enrichMessageAccumulatorWithExistingMessageChannelMessageAssociations(messages, messageAccumulatorMap, [
                    ...existingMessageChannelMessageAssociations,
                    ...messageChannelMessageAssociationsReferencingMessageThread,
                ]);
                await this.enrichMessageAccumulatorWithMessageThreadToCreate(messages, messageAccumulatorMap);
                const associationToCreateByMessageId = new Map();
                for (const message of messages) {
                    const messageAccumulator = messageAccumulatorMap.get(message.externalId);
                    if (!(0, utils_1.isDefined)(messageAccumulator)) {
                        throw new Error(`Message accumulator should reference the message, this should never happen`);
                    }
                    const messageThreadId = messageAccumulator.threadToCreate?.id ??
                        messageAccumulator.existingThreadInDB?.id;
                    if (!(0, utils_1.isDefined)(messageThreadId)) {
                        throw new Error(`Message thread id should be defined, either in the threadToCreate or existingThreadInDB`);
                    }
                    let newOrExistingMessageId;
                    if (!(0, utils_1.isDefined)(messageAccumulator.existingMessageInDB)) {
                        newOrExistingMessageId = (0, uuid_1.v4)();
                        const messageToCreate = {
                            id: newOrExistingMessageId,
                            headerMessageId: message.headerMessageId,
                            subject: message.subject,
                            receivedAt: message.receivedAt,
                            text: message.text,
                            messageThreadId,
                            isDraft: message.isDraft,
                        };
                        messageAccumulator.messageToCreate = messageToCreate;
                    }
                    else {
                        newOrExistingMessageId = messageAccumulator.existingMessageInDB.id;
                    }
                    if (!(0, utils_1.isDefined)(messageAccumulator.existingMessageChannelMessageAssociationInDB)) {
                        const associationToCreate = associationToCreateByMessageId.get(newOrExistingMessageId) ?? {
                            id: (0, uuid_1.v4)(),
                            messageChannelId,
                            messageId: newOrExistingMessageId,
                            messageExternalId: message.externalId,
                            messageThreadExternalId: message.messageThreadExternalId,
                            direction: message.direction,
                        };
                        associationToCreateByMessageId.set(newOrExistingMessageId, associationToCreate);
                        messageAccumulator.messageChannelMessageAssociationToCreate =
                            associationToCreate;
                    }
                    messageAccumulatorMap.set(message.externalId, messageAccumulator);
                }
                const messageThreadsToCreate = Array.from(messageAccumulatorMap.values())
                    .map((accumulator) => accumulator.threadToCreate)
                    .filter(utils_1.isDefined);
                const threadSubjectUpdates = new Map();
                for (const message of messages) {
                    const messageAccumulator = messageAccumulatorMap.get(message.externalId);
                    if (!(0, utils_1.isDefined)(messageAccumulator)) {
                        continue;
                    }
                    if ((0, utils_1.isDefined)(messageAccumulator.existingThreadInDB) &&
                        (0, utils_1.isDefined)(messageAccumulator.messageToCreate) &&
                        (0, utils_1.isDefined)(message.subject)) {
                        const threadId = messageAccumulator.existingThreadInDB.id;
                        const existing = threadSubjectUpdates.get(threadId);
                        const receivedAt = message.receivedAt?.getTime() ?? 0;
                        if (!(0, utils_1.isDefined)(existing) || receivedAt > existing.receivedAt) {
                            threadSubjectUpdates.set(threadId, {
                                subject: message.subject,
                                receivedAt,
                            });
                        }
                    }
                }
                if (messageThreadsToCreate.length > 0) {
                    await messageThreadRepository.insert(messageThreadsToCreate);
                }
                if (threadSubjectUpdates.size > 0) {
                    await messageThreadRepository.upsert(Array.from(threadSubjectUpdates.entries()).map(([id, { subject }]) => ({ id, subject })), ['id']);
                }
                const messagesToCreate = Array.from(messageAccumulatorMap.values())
                    .map((accumulator) => accumulator.messageToCreate)
                    .filter(utils_1.isDefined);
                await messageRepository.insert(messagesToCreate);
                const messageChannelMessageAssociationsToCreate = Array.from(associationToCreateByMessageId.values());
                await messageChannelMessageAssociationRepository.insert(messageChannelMessageAssociationsToCreate);
                const messageExternalIdsAndIdsMap = new Map();
                const messageExternalIdToMessageChannelMessageAssociationIdMap = new Map();
                const messageExternalIdToMessageThreadIdMap = new Map();
                for (const [externalId, accumulator,] of messageAccumulatorMap.entries()) {
                    if ((0, utils_1.isDefined)(accumulator.messageToCreate)) {
                        messageExternalIdsAndIdsMap.set(externalId, accumulator.messageToCreate.id);
                    }
                    if ((0, utils_1.isDefined)(accumulator.existingMessageInDB)) {
                        messageExternalIdsAndIdsMap.set(externalId, accumulator.existingMessageInDB.id);
                    }
                    const messageThreadId = accumulator.messageToCreate?.messageThreadId ??
                        accumulator.existingMessageInDB?.messageThreadId;
                    if ((0, utils_1.isDefined)(messageThreadId)) {
                        messageExternalIdToMessageThreadIdMap.set(externalId, messageThreadId);
                    }
                    const createdAssociationId = accumulator.messageChannelMessageAssociationToCreate?.id;
                    const existingAssociationId = accumulator.existingMessageChannelMessageAssociationInDB?.id;
                    const associationId = createdAssociationId ?? existingAssociationId;
                    if ((0, utils_1.isDefined)(associationId)) {
                        messageExternalIdToMessageChannelMessageAssociationIdMap.set(externalId, associationId);
                    }
                }
                return {
                    createdMessages: messagesToCreate,
                    messageExternalIdsAndIdsMap,
                    messageExternalIdToMessageChannelMessageAssociationIdMap,
                    messageExternalIdToMessageThreadIdMap,
                };
            }, authContext, { lite: true });
        }
        async enrichMessageAccumulatorWithExistingMessages(messages, messageAccumulatorMap, existingMessagesInDB, messageChannelMessageAssociationsReferencingMessageThread) {
            for (const message of messages) {
                const messageWithSameExternalIdInChannel = messageChannelMessageAssociationsReferencingMessageThread.find((association) => association.messageExternalId === message.externalId)?.message;
                const messageWithSameHeaderMessageId = existingMessagesInDB.find((existingMessage) => existingMessage.headerMessageId === message.headerMessageId);
                const existingMessage = messageWithSameExternalIdInChannel ?? messageWithSameHeaderMessageId;
                if (!(0, utils_1.isDefined)(existingMessage)) {
                    messageAccumulatorMap.set(message.externalId, {});
                    continue;
                }
                messageAccumulatorMap.set(message.externalId, {
                    existingMessageInDB: existingMessage,
                });
            }
        }
        async enrichMessageAccumulatorWithExistingMessageThreadIds(messages, messageAccumulatorMap, messageChannelMessageAssociationsReferencingMessageThread, workspaceId) {
            for (const message of messages) {
                const messageAccumulator = messageAccumulatorMap.get(message.externalId);
                if (!(0, utils_1.isDefined)(messageAccumulator)) {
                    throw new Error(`Message accumulator should reference the message, this should never happen`);
                }
                const messageChannelMessageAssociationReferencingMessageThread = messageChannelMessageAssociationsReferencingMessageThread.find((association) => association.messageThreadExternalId ===
                    message.messageThreadExternalId);
                const existingThreadIdInDBIfMessageIsExistingInDB = messageAccumulator.existingMessageInDB?.messageThreadId;
                const existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation = messageChannelMessageAssociationReferencingMessageThread?.message
                    ?.messageThreadId;
                if ((0, utils_1.isDefined)(existingThreadIdInDBIfMessageIsExistingInDB)) {
                    messageAccumulator.existingThreadInDB = {
                        id: existingThreadIdInDBIfMessageIsExistingInDB,
                    };
                }
                if ((0, utils_1.isDefined)(existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation)) {
                    messageAccumulator.existingThreadInDB = {
                        id: existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation,
                    };
                }
                if ((0, utils_1.isDefined)(existingThreadIdInDBIfMessageIsExistingInDB) &&
                    (0, utils_1.isDefined)(existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation) &&
                    existingThreadIdInDBIfMessageIsExistingInDB !==
                        existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation) {
                    this.logger.warn(`
          WorkspaceId: ${workspaceId} /
          Message ExternalId: ${message.externalId} /
          Message HeaderId: ${message.headerMessageId} /
          Message Thread ExternalId: ${message.messageThreadExternalId} /
          Message Thread Id in DB: ${existingThreadIdInDBIfMessageIsExistingInDB} /
          Message Thread Id in Message Channel Message Association: ${existingThreadIdInDBIfMessageIsReferencedInMessageChannelMessageAssociation} /
          Message Subject: ${message.subject} /
          Message Received At: ${message.receivedAt} /
          Thread inter channel detected`);
                }
                messageAccumulatorMap.set(message.externalId, messageAccumulator);
            }
        }
        async enrichMessageAccumulatorWithExistingMessageChannelMessageAssociations(messages, messageAccumulatorMap, existingMessageChannelMessageAssociations) {
            for (const message of messages) {
                const messageAccumulator = messageAccumulatorMap.get(message.externalId);
                if (!(0, utils_1.isDefined)(messageAccumulator)) {
                    throw new Error(`Message accumulator should reference the message, this should never happen`);
                }
                const existingMessage = messageAccumulator.existingMessageInDB;
                if (!(0, utils_1.isDefined)(existingMessage)) {
                    continue;
                }
                const existingMessageChannelMessageAssociation = existingMessageChannelMessageAssociations.find((association) => association.messageId === existingMessage.id);
                if (existingMessageChannelMessageAssociation) {
                    messageAccumulator.existingMessageChannelMessageAssociationInDB =
                        existingMessageChannelMessageAssociation;
                }
            }
        }
        async enrichMessageAccumulatorWithMessageThreadToCreate(messages, messageAccumulatorMap) {
            for (const [index, message] of messages.entries()) {
                const messageAccumulator = messageAccumulatorMap.get(message.externalId);
                if (!(0, utils_1.isDefined)(messageAccumulator)) {
                    throw new Error(`Message accumulator should reference the message, this should never happen`);
                }
                const previousMessageWithSameThreadExternalId = messages.find((otherMessage, otherMessageIndex) => otherMessage.messageThreadExternalId ===
                    message.messageThreadExternalId && otherMessageIndex < index);
                let newOrExistingMessageThreadId;
                if ((0, utils_1.isDefined)(messageAccumulator.existingThreadInDB)) {
                    newOrExistingMessageThreadId = messageAccumulator.existingThreadInDB.id;
                }
                if ((0, utils_1.isDefined)(previousMessageWithSameThreadExternalId)) {
                    const previousMessageAccumulator = messageAccumulatorMap.get(previousMessageWithSameThreadExternalId.externalId);
                    const previousMessageThreadId = previousMessageAccumulator?.threadToCreate?.id ??
                        previousMessageAccumulator?.existingThreadInDB?.id;
                    if (!(0, utils_1.isDefined)(previousMessageThreadId)) {
                        throw new Error(`Previous message should have a thread id, either in the messageToCreate or existingMessageInDB`);
                    }
                    newOrExistingMessageThreadId = previousMessageThreadId;
                    messageAccumulator.existingThreadInDB = {
                        id: previousMessageThreadId,
                    };
                }
                if (!(0, utils_1.isDefined)(newOrExistingMessageThreadId)) {
                    newOrExistingMessageThreadId = (0, uuid_1.v4)();
                    messageAccumulator.threadToCreate = {
                        id: newOrExistingMessageThreadId,
                        subject: message.subject,
                    };
                }
                messageAccumulatorMap.set(message.externalId, messageAccumulator);
            }
        }
    };
    return MessagingMessageService = _classThis;
})();
exports.MessagingMessageService = MessagingMessageService;
