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
exports.MessagingSaveMessagesAndEnqueueContactCreationService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const create_company_and_contact_job_1 = require("src/modules/contact-creation-manager/jobs/create-company-and-contact.job");
const is_group_email_1 = require("src/modules/messaging/message-import-manager/utils/is-group-email");
const is_work_email_1 = require("src/utils/is-work-email");
let MessagingSaveMessagesAndEnqueueContactCreationService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingSaveMessagesAndEnqueueContactCreationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingSaveMessagesAndEnqueueContactCreationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return MessagingSaveMessagesAndEnqueueContactCreationService = _classThis;
})();
exports.MessagingSaveMessagesAndEnqueueContactCreationService = MessagingSaveMessagesAndEnqueueContactCreationService;
