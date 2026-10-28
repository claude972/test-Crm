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
exports.MessagingSaveMessagesAndEnqueueContactCreationService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const create_company_and_contact_job_1 = require("src/modules/contact-creation-manager/jobs/create-company-and-contact.job");
const messaging_message_folder_association_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message-folder-association.service");
const messaging_message_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message.service");
const is_group_email_1 = require("src/modules/messaging/message-import-manager/utils/is-group-email");
const messaging_message_participant_service_1 = require("src/modules/messaging/message-participant-manager/services/messaging-message-participant.service");
const is_work_email_1 = require("src/utils/is-work-email");
let MessagingSaveMessagesAndEnqueueContactCreationService = class MessagingSaveMessagesAndEnqueueContactCreationService {
    messageQueueService;
    messageService;
    messageParticipantService;
    messageFolderAssociationService;
    workspaceOrmManager;
    constructor(messageQueueService, messageService, messageParticipantService, messageFolderAssociationService, workspaceOrmManager) {
        this.messageQueueService = messageQueueService;
        this.messageService = messageService;
        this.messageParticipantService = messageParticipantService;
        this.messageFolderAssociationService = messageFolderAssociationService;
        this.workspaceOrmManager = workspaceOrmManager;
    }
    async saveMessagesAndEnqueueContactCreation({ messagesToSave, messageChannel, connectedAccount, workspaceId, personHandleField, }) {
        const handleAliases = connectedAccount.handleAliases || [];
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        const savedMessagesResult = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            return this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                const { messageExternalIdsAndIdsMap, messageExternalIdToMessageChannelMessageAssociationIdMap, messageExternalIdToMessageThreadIdMap, } = await this.messageService.saveMessagesWithinTransaction(messagesToSave, messageChannel.id, transactionScope, workspaceId);
                const participantsWithMessageId = messagesToSave.flatMap((message) => {
                    const messageId = messageExternalIdsAndIdsMap.get(message.externalId);
                    return messageId
                        ? message.participants.map((participant) => {
                            const fromHandle = message.participants.find((p) => p.role === types_1.MessageParticipantRole.FROM)?.handle || '';
                            const isMessageSentByConnectedAccount = handleAliases.includes(fromHandle) ||
                                fromHandle === connectedAccount.handle;
                            const isParticipantConnectedAccount = handleAliases.includes(participant.handle) ||
                                participant.handle === connectedAccount.handle;
                            const isExcludedByNonProfessionalEmails = messageChannel.excludeNonProfessionalEmails &&
                                !(0, is_work_email_1.isWorkEmail)(participant.handle);
                            const isExcludedByGroupEmails = messageChannel.excludeGroupEmails &&
                                (0, is_group_email_1.isGroupEmail)(participant.handle);
                            // Drafts are outgoing, so recipients of an unsent email don't become contacts
                            const shouldCreateContact = !message.isDraft &&
                                !!participant.handle &&
                                !isParticipantConnectedAccount &&
                                !isExcludedByNonProfessionalEmails &&
                                !isExcludedByGroupEmails &&
                                (messageChannel.contactAutoCreationPolicy ===
                                    types_1.MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED ||
                                    (messageChannel.contactAutoCreationPolicy ===
                                        types_1.MessageChannelContactAutoCreationPolicy.SENT &&
                                        isMessageSentByConnectedAccount));
                            return {
                                ...participant,
                                messageId,
                                shouldCreateContact,
                            };
                        })
                        : [];
                });
                const savedMessageParticipants = await this.messageParticipantService.saveMessageParticipants(participantsWithMessageId, workspaceId, transactionScope);
                const folderAssociations = messagesToSave.flatMap((message) => {
                    const messageFolderIds = message.messageFolderIds ?? [];
                    if (messageFolderIds.length === 0) {
                        return [];
                    }
                    const associationId = messageExternalIdToMessageChannelMessageAssociationIdMap.get(message.externalId);
                    if (!(0, utils_1.isDefined)(associationId)) {
                        return [];
                    }
                    return [
                        {
                            messageChannelMessageAssociationId: associationId,
                            messageFolderIds,
                        },
                    ];
                });
                await this.messageFolderAssociationService.saveMessageFolderAssociations(folderAssociations, workspaceId, transactionScope);
                return {
                    participantsWithMessageId,
                    savedMessageParticipants,
                    messageExternalIdsAndIdsMap,
                    messageExternalIdToMessageThreadIdMap,
                };
            });
        }, authContext, { lite: true });
        if (messageChannel.isContactAutoCreationEnabled && savedMessagesResult) {
            const contactsToCreate = savedMessagesResult.participantsWithMessageId.filter((participant) => participant.shouldCreateContact);
            await this.messageQueueService.add(create_company_and_contact_job_1.CreateCompanyAndContactJob.name, {
                workspaceId,
                connectedAccount,
                contactsToCreate,
                source: types_1.FieldActorSource.EMAIL,
            });
        }
        if (!(0, utils_1.isDefined)(savedMessagesResult)) {
            return undefined;
        }
        const messageIds = [
            ...new Set(savedMessagesResult.participantsWithMessageId.map(({ messageId }) => messageId)),
        ];
        if (messageChannel.type !== types_1.MessageChannelType.APP) {
            await this.messageParticipantService.matchMessageParticipants({
                participants: savedMessagesResult.savedMessageParticipants,
                messageIds,
                workspaceId,
                matchWith: 'workspaceMemberAndPerson',
            });
        }
        else {
            await this.matchAppChannelParticipants({
                personHandleField,
                messageIds,
                workspaceId,
            });
        }
        return {
            messageExternalIdsAndIdsMap: savedMessagesResult.messageExternalIdsAndIdsMap,
            messageExternalIdToMessageThreadIdMap: savedMessagesResult.messageExternalIdToMessageThreadIdMap,
        };
    }
    // matching non-email handles as emails would null out app-supplied identities, so only the declared field is used
    async matchAppChannelParticipants({ personHandleField, messageIds, workspaceId, }) {
        if (!(0, utils_1.isDefined)(personHandleField)) {
            await this.messageParticipantService.matchMessageParticipants({
                participants: [],
                messageIds,
                workspaceId,
                matchWith: 'targetsOnly',
            });
            return;
        }
        await this.messageParticipantService.matchMessageParticipants({
            participants: await this.findUnlinkedParticipants({
                messageIds,
                workspaceId,
            }),
            messageIds,
            workspaceId,
            matchWith: 'personOnly',
            personHandleField,
        });
    }
    // read back rather than taken from the save, so a retry after a failed match still links rows an earlier attempt stored
    async findUnlinkedParticipants({ messageIds, workspaceId, }) {
        return this.workspaceOrmManager.executeInWorkspaceContext(async () => this.workspaceOrmManager
            .getRepository('messageParticipant', { shouldBypassPermissionChecks: true })
            .find({ where: { messageId: (0, typeorm_1.Any)(messageIds), personId: (0, typeorm_1.IsNull)() } }), (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
    }
};
exports.MessagingSaveMessagesAndEnqueueContactCreationService = MessagingSaveMessagesAndEnqueueContactCreationService;
exports.MessagingSaveMessagesAndEnqueueContactCreationService = MessagingSaveMessagesAndEnqueueContactCreationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.contactCreationQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, messaging_message_service_1.MessagingMessageService,
        messaging_message_participant_service_1.MessagingMessageParticipantService,
        messaging_message_folder_association_service_1.MessagingMessageFolderAssociationService, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object])
], MessagingSaveMessagesAndEnqueueContactCreationService);
