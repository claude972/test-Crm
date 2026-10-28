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
exports.MessagingMessagesImportService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("src/shared/utils");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const filter_emails_util_1 = require("src/modules/messaging/message-import-manager/utils/filter-emails.util");
const types_1 = require("src/shared/types");
let MessagingMessagesImportService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessagesImportService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessagesImportService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cacheStorage;
        messageChannelSyncStatusService;
        saveMessagesAndEnqueueContactCreationService;
        messagingMonitoringService;
        blocklistRepository;
        emailAliasManagerService;
        workspaceOrmManager;
        messageChannelRepository;
        messagingGetMessagesService;
        messageImportErrorHandlerService;
        userWorkspaceRepository;
        workspaceRepository;
        kovaaLabConfigService;
        logger = new common_1.Logger(MessagingMessagesImportService.name);
        constructor(cacheStorage, messageChannelSyncStatusService, saveMessagesAndEnqueueContactCreationService, messagingMonitoringService, blocklistRepository, emailAliasManagerService, workspaceOrmManager, messageChannelRepository, messagingGetMessagesService, messageImportErrorHandlerService, userWorkspaceRepository, workspaceRepository, kovaaLabConfigService) {
            this.cacheStorage = cacheStorage;
            this.messageChannelSyncStatusService = messageChannelSyncStatusService;
            this.saveMessagesAndEnqueueContactCreationService = saveMessagesAndEnqueueContactCreationService;
            this.messagingMonitoringService = messagingMonitoringService;
            this.blocklistRepository = blocklistRepository;
            this.emailAliasManagerService = emailAliasManagerService;
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageChannelRepository = messageChannelRepository;
            this.messagingGetMessagesService = messagingGetMessagesService;
            this.messageImportErrorHandlerService = messageImportErrorHandlerService;
            this.userWorkspaceRepository = userWorkspaceRepository;
            this.workspaceRepository = workspaceRepository;
            this.kovaaLabConfigService = kovaaLabConfigService;
        }
        async processMessageBatchImport(messageChannel, connectedAccount, workspaceId, batchSize) {
            let messageIdsToFetch = [];
            const messagesGetBatchSize = batchSize ??
                this.kovaaLabConfigService.get('MESSAGING_MESSAGES_GET_BATCH_SIZE');
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                try {
                    if (messageChannel.syncStage !==
                        types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED) {
                        return;
                    }
                    await this.messagingMonitoringService.track({
                        eventName: 'messages_import.started',
                        workspaceId,
                        connectedAccountId: messageChannel.connectedAccountId,
                        messageChannelId: messageChannel.id,
                    });
                    await this.messageChannelSyncStatusService.markAsMessagesImportOngoing([messageChannel.id], workspaceId);
                    if (!(0, utils_1.isDefined)(connectedAccount.handleAliases)) {
                        connectedAccount.handleAliases =
                            await this.emailAliasManagerService.refreshHandleAliases(connectedAccount, workspaceId);
                    }
                    messageIdsToFetch = await this.cacheStorage.setPop(`messages-to-import:${workspaceId}:${messageChannel.id}`, messagesGetBatchSize);
                    if (!messageIdsToFetch?.length) {
                        await this.messageChannelSyncStatusService.markAsMessageSyncCompleted([messageChannel.id], workspaceId);
                        return await this.trackMessageImportCompleted(messageChannel, workspaceId);
                    }
                    const allMessages = await this.messagingGetMessagesService.getMessages(messageIdsToFetch, connectedAccount, messageChannel);
                    const messageFolders = messageChannel.messageFolders ?? [];
                    const foldersWithExternalId = messageFolders.filter((folder) => (0, utils_1.isDefined)(folder.externalId));
                    const folderExternalToInternalMap = new Map(foldersWithExternalId.map((folder) => [
                        folder.externalId,
                        folder.id,
                    ]));
                    for (const message of allMessages) {
                        const externalFolderIds = message.messageFolderExternalIds ?? [];
                        message.messageFolderIds = externalFolderIds
                            .map((externalId) => folderExternalToInternalMap.get(externalId))
                            .filter(utils_1.isDefined);
                    }
                    const userWorkspace = await this.userWorkspaceRepository.findOne({
                        where: {
                            id: connectedAccount.userWorkspaceId,
                        },
                    });
                    const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
                    const workspaceMember = userWorkspace
                        ? await workspaceMemberRepository.findOne({
                            where: { userId: userWorkspace.userId },
                        })
                        : null;
                    const blocklist = await this.blocklistRepository.getEntriesApplicableToWorkspaceMember({
                        workspaceMemberId: workspaceMember?.id ?? null,
                        workspaceId,
                    });
                    if (!(0, utils_1.isDefined)(messageChannel.handle)) {
                        throw new message_import_driver_exception_1.MessageImportDriverException('Message channel handle is required', message_import_driver_exception_1.MessageImportDriverExceptionCode.CHANNEL_MISCONFIGURED);
                    }
                    if (!(0, utils_1.isDefined)(connectedAccount.handleAliases)) {
                        throw new message_import_driver_exception_1.MessageImportDriverException('Message channel handle is required', message_import_driver_exception_1.MessageImportDriverExceptionCode.CHANNEL_MISCONFIGURED);
                    }
                    const workspace = await this.workspaceRepository.findOne({
                        where: { id: workspaceId },
                        select: ['id', 'isInternalMessagesImportEnabled'],
                    });
                    const messagesToSave = (0, filter_emails_util_1.filterEmails)(messageChannel.handle, [...connectedAccount.handleAliases], allMessages, blocklist
                        .map((blocklistItem) => blocklistItem.handle)
                        .filter(utils_1.isDefined), messageChannel.excludeGroupEmails, workspace?.isInternalMessagesImportEnabled ?? false);
                    if (messagesToSave.length > 0) {
                        await this.saveMessagesAndEnqueueContactCreationService.saveMessagesAndEnqueueContactCreation({
                            messagesToSave,
                            messageChannel,
                            connectedAccount,
                            workspaceId,
                        });
                    }
                    const isLastBatch = messageIdsToFetch.length < messagesGetBatchSize;
                    if (isLastBatch) {
                        await this.messageChannelSyncStatusService.markAsMessageSyncCompleted([messageChannel.id], workspaceId);
                    }
                    else {
                        await this.messageChannelSyncStatusService.markAsMessagesImportPending([messageChannel.id], workspaceId);
                    }
                    await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                        throttleFailureCount: 0,
                        throttleRetryAfter: null,
                        syncStageStartedAt: null,
                    });
                    if (!isLastBatch) {
                        await this.cacheStorage.incrBy(`messages-imported:${workspaceId}:${messageChannel.id}`, messageIdsToFetch.length);
                    }
                    return await this.trackMessageImportCompleted(messageChannel, workspaceId);
                }
                catch (error) {
                    this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Error (${error.code}) importing messages: ${error.message}`);
                    await this.cacheStorage.setAdd(`messages-to-import:${workspaceId}:${messageChannel.id}`, messageIdsToFetch);
                    await this.messageImportErrorHandlerService.handleDriverException(error, messaging_import_exception_handler_service_1.MessageImportSyncStep.MESSAGES_IMPORT_ONGOING, messageChannel, workspaceId);
                    return await this.trackMessageImportCompleted(messageChannel, workspaceId);
                }
            }, authContext, { lite: true });
        }
        async trackMessageImportCompleted(messageChannel, workspaceId) {
            await this.messagingMonitoringService.track({
                eventName: 'messages_import.completed',
                workspaceId,
                connectedAccountId: messageChannel.connectedAccountId,
                messageChannelId: messageChannel.id,
            });
        }
    };
    return MessagingMessagesImportService = _classThis;
})();
exports.MessagingMessagesImportService = MessagingMessagesImportService;
