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
exports.MessagingDraftSendService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingDraftSendService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingDraftSendService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingDraftSendService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        messageOutboundService;
        messageCleanerService;
        messageChannelRepository;
        constructor(workspaceOrmManager, messageOutboundService, messageCleanerService, messageChannelRepository) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageOutboundService = messageOutboundService;
            this.messageCleanerService = messageCleanerService;
            this.messageChannelRepository = messageChannelRepository;
        }
        async sendDraftMessage({ draftMessageId, sendMessageInput, connectedAccount, workspaceId, }) {
            const draftAssociation = await this.resolveDraftAssociation(draftMessageId, connectedAccount.id, workspaceId);
            if (!(0, utils_1.isDefined)(draftAssociation)) {
                throw new Error(`Could not find a synced draft to send for message ${draftMessageId}`);
            }
            return this.messageOutboundService.sendDraft(draftAssociation.messageExternalId, sendMessageInput, connectedAccount);
        }
        async getSentMessageThreadId({ messageExternalId, workspaceId, }) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                const association = await messageChannelMessageAssociationRepository.findOne({
                    where: { messageExternalId },
                    relations: { message: true },
                });
                return association?.message?.messageThreadId ?? undefined;
            }, authContext, { lite: true });
        }
        async deleteSentDraft({ draftMessageId, connectedAccountId, workspaceId, }) {
            const draftAssociation = await this.resolveDraftAssociation(draftMessageId, connectedAccountId, workspaceId);
            if (!(0, utils_1.isDefined)(draftAssociation)) {
                return;
            }
            await this.messageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
                workspaceId,
                messageExternalIds: [draftAssociation.messageExternalId],
                messageChannelId: draftAssociation.messageChannelId,
            });
        }
        // Scoped to the caller's own channels so a member cannot act on another
        // member's draft by passing its message id.
        async resolveDraftAssociation(draftMessageId, connectedAccountId, workspaceId) {
            const channels = await this.messageChannelRepository.find({
                where: { connectedAccountId, workspaceId },
            });
            const channelIds = channels.map((channel) => channel.id);
            if (channelIds.length === 0) {
                return null;
            }
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            const associations = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                return messageChannelMessageAssociationRepository.find({
                    where: {
                        messageId: draftMessageId,
                        messageChannelId: (0, typeorm_1.In)(channelIds),
                    },
                });
            }, authContext, { lite: true });
            const association = associations.find((currentAssociation) => (0, guards_1.isNonEmptyString)(currentAssociation.messageExternalId));
            if (!association || !(0, guards_1.isNonEmptyString)(association.messageExternalId)) {
                return null;
            }
            return {
                messageExternalId: association.messageExternalId,
                messageChannelId: association.messageChannelId,
            };
        }
    };
    return MessagingDraftSendService = _classThis;
})();
exports.MessagingDraftSendService = MessagingDraftSendService;
