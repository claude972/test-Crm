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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailGroupMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const macro_1 = require("@lingui/core/macro");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const uuid_1 = require("uuid");
const billing_service_1 = require("src/engine/core-modules/billing/services/billing.service");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const emailing_domain_status_type_1 = require("src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type");
const emailing_domain_entity_1 = require("src/engine/core-modules/emailing-domain/emailing-domain.entity");
const throttler_exception_1 = require("src/engine/core-modules/throttler/throttler.exception");
const usage_limit_speed_service_1 = require("src/engine/core-modules/usage-limit/services/usage-limit-speed.service");
const usage_operation_type_enum_1 = require("src/engine/core-modules/usage/enums/usage-operation-type.enum");
const usage_resource_type_enum_1 = require("src/engine/core-modules/usage/enums/usage-resource-type.enum");
const emailing_domain_sender_service_1 = require("src/modules/emailing/services/emailing-domain-sender.service");
const message_channel_exception_1 = require("src/engine/metadata-modules/message-channel/message-channel.exception");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const email_group_send_throttle_constant_1 = require("src/modules/messaging/message-outbound-manager/drivers/email-group/constants/email-group-send-throttle.constant");
const build_outbound_threading_headers_util_1 = require("src/modules/messaging/message-outbound-manager/utils/build-outbound-threading-headers.util");
const get_domain_from_email_1 = require("src/utils/get-domain-from-email");
let EmailGroupMessageOutboundService = class EmailGroupMessageOutboundService {
    emailingDomainRepository;
    emailingDomainSenderService;
    usageLimitSpeedService;
    billingService;
    cacheStorage;
    constructor(emailingDomainRepository, emailingDomainSenderService, usageLimitSpeedService, billingService, cacheStorage) {
        this.emailingDomainRepository = emailingDomainRepository;
        this.emailingDomainSenderService = emailingDomainSenderService;
        this.usageLimitSpeedService = usageLimitSpeedService;
        this.billingService = billingService;
        this.cacheStorage = cacheStorage;
    }
    async sendMessage(sendMessageInput, connectedAccount) {
        const isPayingCustomer = await this.billingService.isPayingCustomer(connectedAccount.workspaceId);
        if (!isPayingCustomer) {
            throw new message_channel_exception_1.MessageChannelException(`Cannot send from ${connectedAccount.handle}: sending from an email group is available once your workspace is on a paid plan and has been billed.`, message_channel_exception_1.MessageChannelExceptionCode.EMAIL_GROUP_SENDING_REQUIRES_PAID_PLAN);
        }
        const emailingDomain = await this.resolveEmailingDomain(connectedAccount);
        if (emailingDomain.status !== emailing_domain_status_type_1.EmailingDomainStatus.VERIFIED) {
            throw new message_channel_exception_1.MessageChannelException(`Cannot send from ${connectedAccount.handle}: domain ${emailingDomain.domain} is not verified for outbound (status: ${emailingDomain.status}).`, message_channel_exception_1.MessageChannelExceptionCode.EMAIL_GROUP_NOT_CONFIGURED, {
                userFriendlyMessage: (0, macro_1.msg) `Cannot send from ${connectedAccount.handle}: domain ${emailingDomain.domain} is not verified for outbound.`,
            });
        }
        const recipientCount = this.toRecipientArray(sendMessageInput.to).length +
            this.toRecipientArray(sendMessageInput.cc).length +
            this.toRecipientArray(sendMessageInput.bcc).length;
        await this.usageLimitSpeedService.consumeOrThrow({
            resourceType: usage_resource_type_enum_1.UsageResourceType.EMAIL,
            operationType: usage_operation_type_enum_1.UsageOperationType.EMAIL_SEND,
            authContext: (0, build_system_auth_context_util_1.buildSystemAuthContext)(connectedAccount.workspaceId),
            cost: recipientCount,
        });
        const dailyRecipientCountKey = this.buildDailyRecipientCountKey(connectedAccount.workspaceId);
        await this.consumeDailyRecipientAllowanceOrThrow(dailyRecipientCountKey, recipientCount);
        const threadExternalId = sendMessageInput.threadExternalId ??
            sendMessageInput.inReplyTo ??
            `<${(0, uuid_1.v4)()}@${emailingDomain.domain}>`;
        const result = await this.emailingDomainSenderService
            .sendEmail(connectedAccount.workspaceId, emailingDomain.id, {
            sendKind: 'TRANSACTIONAL',
            to: this.toRecipientArray(sendMessageInput.to),
            cc: this.toRecipientArray(sendMessageInput.cc),
            bcc: this.toRecipientArray(sendMessageInput.bcc),
            subject: sendMessageInput.subject,
            text: sendMessageInput.body,
            html: (0, guards_1.isNonEmptyString)(sendMessageInput.html)
                ? sendMessageInput.html
                : undefined,
            from: connectedAccount.handle,
            replyTo: [connectedAccount.handle],
            attachments: sendMessageInput.attachments,
            headers: (0, build_outbound_threading_headers_util_1.buildOutboundThreadingHeaders)({
                threadExternalId,
                inReplyTo: sendMessageInput.inReplyTo,
                references: sendMessageInput.references,
            }),
        })
            .catch(async (error) => {
            await this.cacheStorage.incrBy(dailyRecipientCountKey, -recipientCount);
            throw error;
        });
        return {
            headerMessageId: result.headerMessageId ?? result.messageId,
            messageExternalId: result.messageId,
            threadExternalId,
            deliveredRecipients: result.deliveredRecipients,
        };
    }
    async createDraft() {
        throw new message_channel_exception_1.MessageChannelException('Email handle channels do not support drafts.', message_channel_exception_1.MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT, {
            userFriendlyMessage: (0, macro_1.msg) `Email handle channels do not support drafts.`,
        });
    }
    async sendDraft() {
        throw new message_channel_exception_1.MessageChannelException('Email handle channels do not support drafts.', message_channel_exception_1.MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT, {
            userFriendlyMessage: (0, macro_1.msg) `Email handle channels do not support drafts.`,
        });
    }
    async resolveEmailingDomain(connectedAccount) {
        const handleDomain = (0, get_domain_from_email_1.getDomainFromEmail)(connectedAccount.handle);
        if (!(0, guards_1.isNonEmptyString)(handleDomain)) {
            throw new message_channel_exception_1.MessageChannelException(`Email group ${connectedAccount.handle} has no domain.`, message_channel_exception_1.MessageChannelExceptionCode.EMAIL_GROUP_NOT_CONFIGURED, {
                userFriendlyMessage: (0, macro_1.msg) `Email group ${connectedAccount.handle} has no domain.`,
            });
        }
        const emailingDomain = await this.emailingDomainRepository.findOne(connectedAccount.workspaceId, {
            where: { domain: handleDomain },
        });
        if (!(0, utils_1.isDefined)(emailingDomain)) {
            throw new message_channel_exception_1.MessageChannelException(`No outbound domain configured for ${handleDomain}. Verify it under Outbound Domains to send from ${connectedAccount.handle}.`, message_channel_exception_1.MessageChannelExceptionCode.EMAIL_GROUP_NOT_CONFIGURED, {
                userFriendlyMessage: (0, macro_1.msg) `No outbound domain configured for ${handleDomain}. Verify it under Outbound Domains to send from ${connectedAccount.handle}.`,
            });
        }
        return emailingDomain;
    }
    buildDailyRecipientCountKey(workspaceId) {
        const windowIndex = Math.floor(Date.now() / email_group_send_throttle_constant_1.EMAIL_GROUP_SEND_THROTTLE.windowMs);
        return `email-group-send:recipients:${workspaceId}:${windowIndex}`;
    }
    async consumeDailyRecipientAllowanceOrThrow(dailyRecipientCountKey, recipientCount) {
        const recipientCountInWindow = await this.cacheStorage.incrBy(dailyRecipientCountKey, recipientCount);
        await this.cacheStorage.expire(dailyRecipientCountKey, email_group_send_throttle_constant_1.EMAIL_GROUP_SEND_THROTTLE.windowMs);
        if (recipientCountInWindow <= email_group_send_throttle_constant_1.EMAIL_GROUP_SEND_THROTTLE.maxRecipients) {
            return;
        }
        await this.cacheStorage.incrBy(dailyRecipientCountKey, -recipientCount);
        throw new throttler_exception_1.ThrottlerException(`Email group send limit reached: ${email_group_send_throttle_constant_1.EMAIL_GROUP_SEND_THROTTLE.maxRecipients} recipients per day.`, throttler_exception_1.ThrottlerExceptionCode.LIMIT_REACHED, {
            userFriendlyMessage: (0, macro_1.msg) `Email group send limit reached: ${email_group_send_throttle_constant_1.EMAIL_GROUP_SEND_THROTTLE.maxRecipients} recipients per day.`,
        });
    }
    toRecipientArray(value) {
        if (!(0, utils_1.isDefined)(value)) {
            return [];
        }
        return Array.isArray(value) ? value : [value];
    }
};
exports.EmailGroupMessageOutboundService = EmailGroupMessageOutboundService;
exports.EmailGroupMessageOutboundService = EmailGroupMessageOutboundService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(emailing_domain_entity_1.EmailingDomainEntity)),
    __param(4, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleMessaging)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _a : Object, typeof (_b = typeof emailing_domain_sender_service_1.EmailingDomainSenderService !== "undefined" && emailing_domain_sender_service_1.EmailingDomainSenderService) === "function" ? _b : Object, typeof (_c = typeof usage_limit_speed_service_1.UsageLimitSpeedService !== "undefined" && usage_limit_speed_service_1.UsageLimitSpeedService) === "function" ? _c : Object, typeof (_d = typeof billing_service_1.BillingService !== "undefined" && billing_service_1.BillingService) === "function" ? _d : Object, typeof (_e = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _e : Object])
], EmailGroupMessageOutboundService);
