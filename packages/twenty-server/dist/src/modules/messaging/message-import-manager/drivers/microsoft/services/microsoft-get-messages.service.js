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
var MicrosoftGetMessagesService_1;
var _a;
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
const microsoft_fetch_by_batch_service_1 = require("./microsoft-fetch-by-batch.service");
const microsoft_messages_import_error_handler_service_1 = require("./microsoft-messages-import-error-handler.service");
let MicrosoftGetMessagesService = MicrosoftGetMessagesService_1 = class MicrosoftGetMessagesService {
    microsoftFetchByBatchService;
    microsoftMessagesImportErrorHandler;
    logger = new common_1.Logger(MicrosoftGetMessagesService_1.name);
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
exports.MicrosoftGetMessagesService = MicrosoftGetMessagesService;
exports.MicrosoftGetMessagesService = MicrosoftGetMessagesService = MicrosoftGetMessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [microsoft_fetch_by_batch_service_1.MicrosoftFetchByBatchService, typeof (_a = typeof microsoft_messages_import_error_handler_service_1.MicrosoftMessagesImportErrorHandler !== "undefined" && microsoft_messages_import_error_handler_service_1.MicrosoftMessagesImportErrorHandler) === "function" ? _a : Object])
], MicrosoftGetMessagesService);
