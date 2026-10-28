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
var MessagingMessageService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingMessageService = MessagingMessageService_1 = class MessagingMessageService {
    workspaceOrmManager;
    logger = new common_1.Logger(MessagingMessageService_1.name);
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
exports.MessagingMessageService = MessagingMessageService;
exports.MessagingMessageService = MessagingMessageService = MessagingMessageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object])
], MessagingMessageService);
