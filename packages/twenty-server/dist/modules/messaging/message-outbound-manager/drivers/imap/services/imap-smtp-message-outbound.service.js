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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapSmtpMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const mail_composer_1 = __importDefault(require("nodemailer/lib/mail-composer"));
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const get_imap_folder_path_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/get-imap-folder-path.util");
const is_imap_flow_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/is-imap-flow-error.util");
const parse_message_id_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-message-id.util");
const extract_message_id_from_buffer_util_1 = require("src/modules/messaging/message-outbound-manager/utils/extract-message-id-from-buffer.util");
const format_message_from_header_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-message-from-header.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const to_mail_composer_options_util_1 = require("src/modules/messaging/message-outbound-manager/utils/to-mail-composer-options.util");
let ImapSmtpMessageOutboundService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ImapSmtpMessageOutboundService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ImapSmtpMessageOutboundService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        smtpClientProvider;
        imapClientProvider;
        imapFindDraftsFolderService;
        messageChannelRepository;
        messageFolderRepository;
        logger = new common_1.Logger(ImapSmtpMessageOutboundService.name);
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
    return ImapSmtpMessageOutboundService = _classThis;
})();
exports.ImapSmtpMessageOutboundService = ImapSmtpMessageOutboundService;
