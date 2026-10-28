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
exports.MessagingDeleteGroupEmailMessagesService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const is_group_email_1 = require("src/modules/messaging/message-import-manager/utils/is-group-email");
const MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE = 500;
const MESSAGE_EXTERNAL_ID_DELETION_CHUNK_SIZE = 200;
let MessagingDeleteGroupEmailMessagesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingDeleteGroupEmailMessagesService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingDeleteGroupEmailMessagesService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        messagingMessageCleanerService;
        logger = new common_1.Logger(MessagingDeleteGroupEmailMessagesService.name);
        constructor(workspaceOrmManager, messagingMessageCleanerService) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.messagingMessageCleanerService = messagingMessageCleanerService;
        }
        async deleteGroupEmailMessages(workspaceId, messageChannelId) {
            this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Deleting messages from group email addresses`);
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                const messageParticipantRepository = this.workspaceOrmManager.getRepository('messageParticipant', { shouldBypassPermissionChecks: true });
                let cursorId;
                let totalDeletedCount = 0;
                for (;;) {
                    const associations = await messageChannelMessageAssociationRepository.find({
                        where: {
                            messageChannelId,
                            ...((0, utils_1.isDefined)(cursorId) ? { id: (0, typeorm_1.MoreThan)(cursorId) } : {}),
                        },
                        order: { id: 'ASC' },
                        take: MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE,
                    });
                    if (associations.length === 0) {
                        break;
                    }
                    const messageIds = [
                        ...new Set(associations
                            .map((association) => association.messageId)
                            .filter(guards_1.isNonEmptyString)),
                    ];
                    const senders = await messageParticipantRepository.find({
                        where: {
                            messageId: (0, typeorm_1.In)(messageIds),
                            role: types_1.MessageParticipantRole.FROM,
                        },
                    });
                    const groupEmailMessageIds = new Set(senders
                        .filter((sender) => (0, guards_1.isNonEmptyString)(sender.handle) &&
                        (0, is_group_email_1.isGroupEmail)(sender.handle))
                        .map((sender) => sender.messageId));
                    const messageExternalIdsToDelete = associations
                        .filter((association) => groupEmailMessageIds.has(association.messageId))
                        .map((association) => association.messageExternalId)
                        .filter(guards_1.isNonEmptyString);
                    for (const messageExternalIdsChunk of (0, lodash_chunk_1.default)(messageExternalIdsToDelete, MESSAGE_EXTERNAL_ID_DELETION_CHUNK_SIZE)) {
                        await this.messagingMessageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
                            workspaceId,
                            messageExternalIds: messageExternalIdsChunk,
                            messageChannelId,
                        });
                        totalDeletedCount += messageExternalIdsChunk.length;
                    }
                    if (associations.length < MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_BATCH_SIZE) {
                        break;
                    }
                    cursorId = associations[associations.length - 1].id;
                }
                this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed deleting ${totalDeletedCount} group email messages`);
                return totalDeletedCount;
            }, authContext, { lite: true });
        }
    };
    return MessagingDeleteGroupEmailMessagesService = _classThis;
})();
exports.MessagingDeleteGroupEmailMessagesService = MessagingDeleteGroupEmailMessagesService;
