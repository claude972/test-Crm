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
exports.MessagingProcessGroupEmailActionsService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingProcessGroupEmailActionsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingProcessGroupEmailActionsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingProcessGroupEmailActionsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        messageChannelRepository;
        messageFolderRepository;
        messagingDeleteGroupEmailMessagesService;
        logger = new common_1.Logger(MessagingProcessGroupEmailActionsService.name);
        constructor(workspaceOrmManager, messageChannelRepository, messageFolderRepository, messagingDeleteGroupEmailMessagesService) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageChannelRepository = messageChannelRepository;
            this.messageFolderRepository = messageFolderRepository;
            this.messagingDeleteGroupEmailMessagesService = messagingDeleteGroupEmailMessagesService;
        }
        async markMessageChannelAsPendingGroupEmailsAction(messageChannel, workspaceId, pendingGroupEmailsAction) {
            await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, { pendingGroupEmailsAction });
            this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Marked message channel as pending group emails action: ${pendingGroupEmailsAction}`);
        }
        async processGroupEmailActions(messageChannel, workspaceId) {
            const { pendingGroupEmailsAction } = messageChannel;
            if (!(0, utils_1.isDefined)(pendingGroupEmailsAction) ||
                pendingGroupEmailsAction === types_1.MessageChannelPendingGroupEmailsAction.NONE) {
                return;
            }
            this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Processing group email action: ${pendingGroupEmailsAction}`);
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            try {
                await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                    switch (pendingGroupEmailsAction) {
                        case types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_DELETION:
                            await this.handleGroupEmailsDeletion(workspaceId, messageChannel.id);
                            break;
                        case types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_IMPORT:
                            await this.handleGroupEmailsImport(workspaceId, messageChannel.id);
                            break;
                    }
                }, authContext, { lite: true });
                await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                    pendingGroupEmailsAction: types_1.MessageChannelPendingGroupEmailsAction.NONE,
                });
                this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Reset pendingGroupEmailsAction to NONE`);
            }
            catch (error) {
                this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Error processing group email action: ${error.message}`, error.stack);
                throw error;
            }
        }
        async handleGroupEmailsDeletion(workspaceId, messageChannelId) {
            await this.messagingDeleteGroupEmailMessagesService.deleteGroupEmailMessages(workspaceId, messageChannelId);
            await this.resetCursors(workspaceId, messageChannelId);
            this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed GROUP_EMAILS_DELETION action`);
        }
        async handleGroupEmailsImport(workspaceId, messageChannelId) {
            await this.resetCursors(workspaceId, messageChannelId);
            this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed GROUP_EMAILS_IMPORT action`);
        }
        async resetCursors(workspaceId, messageChannelId) {
            await this.messageChannelRepository.update({ id: messageChannelId, workspaceId }, { syncCursor: '' });
            await this.messageFolderRepository.update(workspaceId, { messageChannelId }, { syncCursor: '' });
        }
    };
    return MessagingProcessGroupEmailActionsService = _classThis;
})();
exports.MessagingProcessGroupEmailActionsService = MessagingProcessGroupEmailActionsService;
