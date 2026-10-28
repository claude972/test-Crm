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
exports.MicrosoftGetMessagesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const message_direction_enum_1 = require("src/modules/messaging/common/enums/message-direction.enum");
const compute_message_direction_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-message-direction.util");
const microsoft_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/exceptions/microsoft-import-driver.exception");
const build_reply_to_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/build-reply-to-participants.util");
const extract_message_text_without_quoted_history_util_1 = require("src/modules/messaging/message-import-manager/utils/extract-message-text-without-quoted-history.util");
const format_address_object_as_participants_util_1 = require("src/modules/messaging/message-import-manager/utils/format-address-object-as-participants.util");
const safe_parse_email_address_util_1 = require("src/modules/messaging/message-import-manager/utils/safe-parse-email-address.util");
let MicrosoftGetMessagesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MicrosoftGetMessagesService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MicrosoftGetMessagesService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        microsoftFetchByBatchService;
        microsoftMessagesImportErrorHandler;
        logger = new common_1.Logger(MicrosoftGetMessagesService.name);
        constructor(microsoftFetchByBatchService, microsoftMessagesImportErrorHandler) {
            this.microsoftFetchByBatchService = microsoftFetchByBatchService;
            this.microsoftMessagesImportErrorHandler = microsoftMessagesImportErrorHandler;
        }
        async getMessages(messageIds, connectedAccount) {
            try {
                const { batchResponses } = await this.microsoftFetchByBatchService.fetchAllByBatches(messageIds, connectedAccount);
                const messages = this.formatBatchResponsesAsMessages(batchResponses, connectedAccount);
                return messages;
            }
            catch (error) {
                this.microsoftMessagesImportErrorHandler.handleError(error);
                return [];
            }
        }
        formatBatchResponsesAsMessages(batchResponses, connectedAccount) {
            return batchResponses.flatMap((batchResponse) => {
                return this.formatBatchResponseAsMessages(batchResponse, connectedAccount);
            });
        }
        formatBatchResponseAsMessages(batchResponse, connectedAccount) {
            const parsedResponses = this.parseBatchResponse(batchResponse);
            const messages = parsedResponses.map((response) => {
                if ('error' in response) {
                    if (response.error.statusCode === 404) {
                        return undefined;
                    }
                    throw new microsoft_import_driver_exception_1.MicrosoftImportDriverException(response.error.message, response.error.code, response.error.statusCode);
                }
                const safeParseFrom = response?.from?.emailAddress
                    ? [(0, safe_parse_email_address_util_1.safeParseEmailAddress)(response.from.emailAddress)]
                    : [];
                const safeParseReplyTo = response?.replyTo
                    ?.filter(utils_1.isDefined)
                    .map((recipient) => (0, safe_parse_email_address_util_1.safeParseEmailAddress)(recipient.emailAddress));
                const safeParseTo = response?.toRecipients
                    ?.filter(utils_1.isDefined)
                    .map((recipient) => (0, safe_parse_email_address_util_1.safeParseEmailAddress)(recipient.emailAddress));
                const safeParseCc = response?.ccRecipients
                    ?.filter(utils_1.isDefined)
                    .map((recipient) => (0, safe_parse_email_address_util_1.safeParseEmailAddress)(recipient.emailAddress));
                const safeParseBcc = response?.bccRecipients
                    ?.filter(utils_1.isDefined)
                    .map((recipient) => (0, safe_parse_email_address_util_1.safeParseEmailAddress)(recipient.emailAddress));
                const participants = [
                    ...(safeParseFrom
                        ? (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(safeParseFrom, types_1.MessageParticipantRole.FROM)
                        : []),
                    ...(0, build_reply_to_participants_util_1.buildReplyToParticipants)(safeParseReplyTo, safeParseFrom[0]),
                    ...(safeParseTo
                        ? (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(safeParseTo, types_1.MessageParticipantRole.TO)
                        : []),
                    ...(safeParseCc
                        ? (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(safeParseCc, types_1.MessageParticipantRole.CC)
                        : []),
                    ...(safeParseBcc
                        ? (0, format_address_object_as_participants_util_1.formatAddressObjectAsParticipants)(safeParseBcc, types_1.MessageParticipantRole.BCC)
                        : []),
                ];
                const text = (0, extract_message_text_without_quoted_history_util_1.extractMessageTextWithoutQuotedHistory)(response.body?.contentType === 'text'
                    ? { text: response.body?.content }
                    : { html: response.body?.content });
                return {
                    externalId: response.id,
                    subject: response.subject || '',
                    receivedAt: new Date(response.receivedDateTime),
                    text,
                    headerMessageId: response.internetMessageId,
                    messageThreadExternalId: response.conversationId,
                    direction: response.from
                        ? (0, compute_message_direction_util_1.computeMessageDirection)(response.from.emailAddress.address, connectedAccount)
                        : message_direction_enum_1.MessageDirection.INCOMING,
                    participants,
                    attachments: [],
                    messageFolderExternalIds: response.parentFolderId
                        ? [response.parentFolderId]
                        : [],
                    isDraft: response.isDraft ?? false,
                    messageHeaders: response.internetMessageHeaders ?? [],
                };
            });
            return messages.filter(utils_1.isDefined);
        }
        parseBatchResponse(batchResponse) {
            if (!batchResponse?.responses) {
                return [];
            }
            // oxlint-disable-next-line typescript/no-explicit-any
            return batchResponse.responses.map((response) => {
                if (response.status === 200) {
                    return response.body;
                }
                if (response.status !== 503 && response.status !== 429) {
                    this.logger.error(`Microsoft parseBatchResponse error`, response);
                }
                const errorParsed = response?.body?.error
                    ? response.body.error
                    : {
                        message: 'Microsoft parseBatchResponse error: no response.body.error',
                    };
                return {
                    error: {
                        ...errorParsed,
                        statusCode: response?.status,
                    },
                };
            });
        }
    };
    return MicrosoftGetMessagesService = _classThis;
})();
exports.MicrosoftGetMessagesService = MicrosoftGetMessagesService;
