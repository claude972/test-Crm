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
var InboundEmailImportService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundEmailImportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const guards_1 = require("@sniptt/guards");
const types_1 = require("src/shared/types");
const utils_1 = require("src/shared/utils");
const typeorm_2 = require("typeorm");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const inbound_email_message_source_resolver_service_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source-resolver.service");
const extract_referenced_message_ids_util_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/utils/extract-referenced-message-ids.util");
const messaging_save_messages_and_enqueue_contact_creation_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service");
const is_excluded_group_email_message_util_1 = require("src/modules/messaging/message-import-manager/utils/is-excluded-group-email-message.util");
const is_upstream_spam_util_1 = require("src/modules/messaging/message-import-manager/utils/is-upstream-spam.util");
let InboundEmailImportService = InboundEmailImportService_1 = class InboundEmailImportService {
    kovaaLabConfigService;
    inboundEmailMessageSourceResolverService;
    workspaceOrmManager;
    messagingSaveMessagesAndEnqueueContactCreationService;
    messageChannelRepository;
    connectedAccountRepository;
    logger = new common_1.Logger(InboundEmailImportService_1.name);
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
                headerMessageId: (0, typeorm_2.In)([...storedHeaderMessageIdsByReferencedMessageId.values()].flat()),
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
                messageId: (0, typeorm_2.In)(referencedMessages.map((referencedMessage) => referencedMessage.id)),
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
exports.InboundEmailImportService = InboundEmailImportService;
exports.InboundEmailImportService = InboundEmailImportService = InboundEmailImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __metadata("design:paramtypes", [kovaa_lab_config_service_1.KovaaLabCRMConfigService, typeof (_a = typeof inbound_email_message_source_resolver_service_1.InboundEmailMessageSourceResolverService !== "undefined" && inbound_email_message_source_resolver_service_1.InboundEmailMessageSourceResolverService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, messaging_save_messages_and_enqueue_contact_creation_service_1.MessagingSaveMessagesAndEnqueueContactCreationService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], InboundEmailImportService);
