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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImapSmtpMessageOutboundService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapSmtpMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mail_composer_1 = __importDefault(require("nodemailer/lib/mail-composer"));
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const imap_client_provider_1 = require("src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider");
const imap_find_drafts_folder_service_1 = require("src/modules/messaging/message-import-manager/drivers/imap/services/imap-find-drafts-folder.service");
const get_imap_folder_path_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/get-imap-folder-path.util");
const is_imap_flow_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/is-imap-flow-error.util");
const parse_message_id_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-message-id.util");
const smtp_client_provider_1 = require("src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider");
const extract_message_id_from_buffer_util_1 = require("src/modules/messaging/message-outbound-manager/utils/extract-message-id-from-buffer.util");
const format_message_from_header_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-message-from-header.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const to_mail_composer_options_util_1 = require("src/modules/messaging/message-outbound-manager/utils/to-mail-composer-options.util");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let ImapSmtpMessageOutboundService = ImapSmtpMessageOutboundService_1 = class ImapSmtpMessageOutboundService {
    smtpClientProvider;
    imapClientProvider;
    imapFindDraftsFolderService;
    messageChannelRepository;
    messageFolderRepository;
    logger = new common_1.Logger(ImapSmtpMessageOutboundService_1.name);
    constructor(smtpClientProvider, imapClientProvider, imapFindDraftsFolderService, messageChannelRepository, messageFolderRepository) {
        this.smtpClientProvider = smtpClientProvider;
        this.imapClientProvider = imapClientProvider;
        this.imapFindDraftsFolderService = imapFindDraftsFolderService;
        this.messageChannelRepository = messageChannelRepository;
        this.messageFolderRepository = messageFolderRepository;
    }
    async sendMessage(sendMessageInput, connectedAccount) {
        const { handle, connectionParameters } = connectedAccount;
        const smtpClient = await this.smtpClientProvider.getClient(connectedAccount.id);
        this.assertHandleIsDefined(handle);
        const from = (0, format_message_from_header_util_1.formatMessageFromHeader)({
            fromEmail: (0, guards_1.isNonEmptyString)(sendMessageInput.fromHandle)
                ? (0, get_connected_account_sendable_handle_or_throw_util_1.getConnectedAccountSendableHandleOrThrow)({
                    connectedAccount,
                    requestedFromHandle: sendMessageInput.fromHandle,
                })
                : handle,
            fromName: connectionParameters?.name,
        });
        const messageBuffer = await this.compileRawMessage(from, sendMessageInput);
        await smtpClient.sendMail({
            from,
            to: sendMessageInput.to,
            cc: sendMessageInput.cc,
            bcc: sendMessageInput.bcc,
            raw: messageBuffer,
        });
        if ((0, utils_1.isDefined)(connectionParameters?.IMAP)) {
            const imapClient = await this.imapClientProvider.getClient(connectedAccount.id);
            const messageChannel = await this.messageChannelRepository.findOne({
                where: {
                    connectedAccountId: connectedAccount.id,
                    handle: handle,
                },
            });
            let sentFolder = null;
            if ((0, utils_1.isDefined)(messageChannel)) {
                sentFolder = await this.messageFolderRepository.findOne(connectedAccount.workspaceId, {
                    where: {
                        messageChannelId: messageChannel.id,
                        isSentFolder: true,
                    },
                });
            }
            const sentFolderPath = (0, get_imap_folder_path_util_1.getImapFolderPath)(sentFolder?.externalId, imapClient);
            if ((0, utils_1.isDefined)(sentFolderPath)) {
                await imapClient.append(sentFolderPath, messageBuffer);
            }
            await this.imapClientProvider.closeClient(imapClient);
        }
        return {
            headerMessageId: (0, extract_message_id_from_buffer_util_1.extractMessageIdFromBuffer)(messageBuffer),
        };
    }
    async createDraft(sendMessageInput, connectedAccount) {
        const { handle, connectionParameters } = connectedAccount;
        this.assertHandleIsDefined(handle);
        if (!(0, utils_1.isDefined)(connectionParameters?.IMAP)) {
            throw new Error('IMAP connection is required to create drafts');
        }
        const from = (0, format_message_from_header_util_1.formatMessageFromHeader)({
            fromEmail: (0, guards_1.isNonEmptyString)(sendMessageInput.fromHandle)
                ? (0, get_connected_account_sendable_handle_or_throw_util_1.getConnectedAccountSendableHandleOrThrow)({
                    connectedAccount,
                    requestedFromHandle: sendMessageInput.fromHandle,
                })
                : handle,
            fromName: connectionParameters?.name,
        });
        const messageBuffer = await this.compileRawMessage(from, sendMessageInput);
        const imapClient = await this.imapClientProvider.getClient(connectedAccount.id);
        try {
            const draftsFolder = await this.imapFindDraftsFolderService.findOrCreateDraftsFolder(imapClient);
            if (!(0, utils_1.isDefined)(draftsFolder)) {
                throw new Error('No drafts folder found and could not create one');
            }
            const DRAFT_FLAG = '\\Draft';
            await imapClient.append(draftsFolder.path, messageBuffer, [DRAFT_FLAG]);
        }
        catch (error) {
            if ((0, is_imap_flow_error_util_1.isImapFlowError)(error) && (0, guards_1.isNonEmptyString)(error.responseText)) {
                throw new Error(`Failed to create draft: ${error.responseText}`);
            }
            throw error;
        }
        finally {
            await this.imapClientProvider.closeClient(imapClient);
        }
    }
    async sendDraft(draftExternalId, sendMessageInput, connectedAccount) {
        const sendResult = await this.sendMessage(sendMessageInput, connectedAccount);
        try {
            await this.deleteDraft(draftExternalId, connectedAccount);
        }
        catch (error) {
            this.logger.warn(`Failed to delete IMAP draft ${draftExternalId} after send: ${error}`);
        }
        return sendResult;
    }
    async deleteDraft(externalId, connectedAccount) {
        const parsedMessageId = (0, parse_message_id_util_1.parseMessageId)(externalId);
        if (!(0, utils_1.isDefined)(parsedMessageId)) {
            throw new Error(`Could not resolve IMAP drafts folder and uid from external id ${externalId}`);
        }
        const imapClient = await this.imapClientProvider.getClient(connectedAccount.id);
        try {
            const lock = await imapClient.getMailboxLock(parsedMessageId.folder);
            try {
                await imapClient.messageDelete(`${parsedMessageId.uid}`, { uid: true });
            }
            finally {
                lock.release();
            }
        }
        finally {
            await this.imapClientProvider.closeClient(imapClient);
        }
    }
    async compileRawMessage(from, sendMessageInput) {
        const mail = new mail_composer_1.default((0, to_mail_composer_options_util_1.toMailComposerOptions)(from, sendMessageInput));
        return mail.compile().build();
    }
    assertHandleIsDefined(handle) {
        if (!(0, utils_1.isDefined)(handle)) {
            throw new Error('Handle is required');
        }
    }
};
exports.ImapSmtpMessageOutboundService = ImapSmtpMessageOutboundService;
exports.ImapSmtpMessageOutboundService = ImapSmtpMessageOutboundService = ImapSmtpMessageOutboundService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(4, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __metadata("design:paramtypes", [smtp_client_provider_1.SmtpClientProvider,
        imap_client_provider_1.ImapClientProvider, typeof (_a = typeof imap_find_drafts_folder_service_1.ImapFindDraftsFolderService !== "undefined" && imap_find_drafts_folder_service_1.ImapFindDraftsFolderService) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _b : Object])
], ImapSmtpMessageOutboundService);
