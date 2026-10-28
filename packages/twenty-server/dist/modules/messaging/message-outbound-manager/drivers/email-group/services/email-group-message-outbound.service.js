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
exports.EmailGroupMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const macro_1 = require("@lingui/core/macro");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const uuid_1 = require("uuid");
const emailing_domain_status_type_1 = require("src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type");
const throttler_exception_1 = require("src/engine/core-modules/throttler/throttler.exception");
const usage_operation_type_enum_1 = require("src/engine/core-modules/usage/enums/usage-operation-type.enum");
const usage_resource_type_enum_1 = require("src/engine/core-modules/usage/enums/usage-resource-type.enum");
const message_channel_exception_1 = require("src/engine/metadata-modules/message-channel/message-channel.exception");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const email_group_send_throttle_constant_1 = require("src/modules/messaging/message-outbound-manager/drivers/email-group/constants/email-group-send-throttle.constant");
const build_outbound_threading_headers_util_1 = require("src/modules/messaging/message-outbound-manager/utils/build-outbound-threading-headers.util");
const get_domain_from_email_1 = require("src/utils/get-domain-from-email");
let EmailGroupMessageOutboundService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var EmailGroupMessageOutboundService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            EmailGroupMessageOutboundService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return EmailGroupMessageOutboundService = _classThis;
})();
exports.EmailGroupMessageOutboundService = EmailGroupMessageOutboundService;
