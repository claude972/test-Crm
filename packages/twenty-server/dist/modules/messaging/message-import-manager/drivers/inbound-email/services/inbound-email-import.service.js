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
exports.InboundEmailImportService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const extract_referenced_message_ids_util_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/utils/extract-referenced-message-ids.util");
const is_excluded_group_email_message_util_1 = require("src/modules/messaging/message-import-manager/utils/is-excluded-group-email-message.util");
const is_upstream_spam_util_1 = require("src/modules/messaging/message-import-manager/utils/is-upstream-spam.util");
let InboundEmailImportService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var InboundEmailImportService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            InboundEmailImportService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        kovaaLabConfigService;
        inboundEmailMessageSourceResolverService;
        workspaceOrmManager;
        messagingSaveMessagesAndEnqueueContactCreationService;
        messageChannelRepository;
        connectedAccountRepository;
        logger = new common_1.Logger(InboundEmailImportService.name);
        constructor(kovaaLabConfigService, inboundEmailMessageSourceResolverService, workspaceOrmManager, messagingSaveMessagesAndEnqueueContactCreationService, messageChannelRepository, connectedAccountRepository) {
            this.kovaaLabConfigService = kovaaLabConfigService;
            this.inboundEmailMessageSourceResolverService = inboundEmailMessageSourceResolverService;
            this.workspaceOrmManager = workspaceOrmManager;
            this.messagingSaveMessagesAndEnqueueContactCreationService = messagingSaveMessagesAndEnqueueContactCreationService;
            this.messageChannelRepository = messageChannelRepository;
            this.connectedAccountRepository = connectedAccountRepository;
        }
        async importInboundMessage(params) {
            const { messageReference, envelopeRecipients } = params;
            const inboundEmailDomain = this.kovaaLabConfigService.get('INBOUND_EMAIL_DOMAIN');
            if (!(0, guards_1.isNonEmptyString)(inboundEmailDomain)) {
                this.logger.warn(`Skipping inbound email import for ${messageReference.reference}: email group is not configured.`);
                return { kind: 'unconfigured' };
            }
            const messageSource = this.inboundEmailMessageSourceResolverService.resolve(messageReference.source);
            if (!messageSource.isConfigured()) {
                this.logger.warn(`Skipping inbound email import for ${messageReference.reference}: message source ${messageReference.source} is not configured.`);
                return { kind: 'unconfigured' };
            }
            const recipient = this.matchInboundRecipient(envelopeRecipients, inboundEmailDomain);
            if (!(0, utils_1.isDefined)(recipient)) {
                this.logger.warn(`No recipient at ${inboundEmailDomain} in inbound notification for ${messageReference.reference}`);
                return { kind: 'unmatched', recipient: null };
            }
            const messageChannel = await this.messageChannelRepository.findOne({
                where: { handle: recipient, type: types_1.MessageChannelType.EMAIL_GROUP },
            });
            if (!(0, utils_1.isDefined)(messageChannel)) {
                this.logger.warn(`No email group channel matches recipient ${recipient} (reference ${messageReference.reference})`);
                return { kind: 'unmatched', recipient };
            }
            const message = await messageSource.fetchMessage(messageReference.reference);
            const { workspaceId } = messageChannel;
            const connectedAccount = await this.connectedAccountRepository.findOne({
                where: { id: messageChannel.connectedAccountId, workspaceId },
            });
            if (!(0, utils_1.isDefined)(connectedAccount)) {
                throw new Error(`Email group channel ${messageChannel.id} has no connected account`);
            }
            if ((0, is_upstream_spam_util_1.isUpstreamSpam)(message.messageHeaders ?? []) ||
                (messageChannel.excludeGroupEmails &&
                    (0, is_excluded_group_email_message_util_1.isExcludedGroupEmailMessage)(message, [connectedAccount.handle]))) {
                await messageSource.cleanup(messageReference.reference);
                return {
                    kind: 'excluded',
                    workspaceId,
                    messageChannelId: messageChannel.id,
                };
            }
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const existingThreadExternalId = await this.findExistingThreadExternalId(message, messageChannel.id);
                if ((0, utils_1.isDefined)(existingThreadExternalId)) {
                    message.messageThreadExternalId = existingThreadExternalId;
                }
                await this.messagingSaveMessagesAndEnqueueContactCreationService.saveMessagesAndEnqueueContactCreation({
                    messagesToSave: [message],
                    messageChannel,
                    connectedAccount,
                    workspaceId,
                });
            }, (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
            await messageSource.cleanup(messageReference.reference);
            return {
                kind: 'imported',
                workspaceId,
                messageChannelId: messageChannel.id,
            };
        }
        async findExistingThreadExternalId(message, messageChannelId) {
            const referencedMessageIds = (0, extract_referenced_message_ids_util_1.extractReferencedMessageIds)(message.messageHeaders);
            if (referencedMessageIds.length === 0) {
                return undefined;
            }
            const storedHeaderMessageIdsByReferencedMessageId = new Map(referencedMessageIds.map((referencedMessageId) => {
                const atIndex = referencedMessageId.indexOf('@');
                return [
                    referencedMessageId,
                    atIndex > 1
                        ? [referencedMessageId, referencedMessageId.slice(1, atIndex)]
                        : [referencedMessageId],
                ];
            }));
            const referencedMessages = await this.workspaceOrmManager
                .getRepository('message', {
                shouldBypassPermissionChecks: true,
            })
                .find({
                where: {
                    headerMessageId: (0, typeorm_1.In)([...storedHeaderMessageIdsByReferencedMessageId.values()].flat()),
                },
                select: { id: true, headerMessageId: true },
            });
            if (referencedMessages.length === 0) {
                return undefined;
            }
            const channelAssociations = await this.workspaceOrmManager
                .getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true })
                .find({
                where: {
                    messageChannelId,
                    messageId: (0, typeorm_1.In)(referencedMessages.map((referencedMessage) => referencedMessage.id)),
                },
                select: { messageId: true, messageThreadExternalId: true },
            });
            return referencedMessageIds
                .map((referencedMessageId) => {
                const storedHeaderMessageIds = storedHeaderMessageIdsByReferencedMessageId.get(referencedMessageId) ?? [];
                const referencedMessage = referencedMessages.find((candidate) => (0, guards_1.isNonEmptyString)(candidate.headerMessageId) &&
                    storedHeaderMessageIds.includes(candidate.headerMessageId));
                return channelAssociations.find((association) => association.messageId === referencedMessage?.id)?.messageThreadExternalId;
            })
                .find(guards_1.isNonEmptyString);
        }
        matchInboundRecipient(envelopeRecipients, inboundEmailDomain) {
            const normalizedDomain = inboundEmailDomain.toLowerCase();
            return (envelopeRecipients
                .map((address) => address.toLowerCase())
                .find((address) => address.endsWith(`@${normalizedDomain}`)) ?? null);
        }
    };
    return InboundEmailImportService = _classThis;
})();
exports.InboundEmailImportService = InboundEmailImportService;
