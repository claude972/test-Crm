"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingResetChannelCommand = void 0;
const common_1 = require("@nestjs/common");
const nest_commander_1 = require("nest-commander");
const utils_1 = require("kovaa-lab-shared/utils");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let MessagingResetChannelCommand = (() => {
    let _classDecorators = [(0, nest_commander_1.Command)({
            name: 'messaging:reset-channel',
            description: 'Reset message channel(s) for full resync. If no channel ID provided, resets all channels in the workspace.',
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = nest_commander_1.CommandRunner;
    let _instanceExtraInitializers = [];
    let _parseWorkspaceId_decorators;
    let _parseMessageChannelId_decorators;
    var MessagingResetChannelCommand = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _parseWorkspaceId_decorators = [(0, nest_commander_1.Option)({
                    flags: '-w, --workspace-id <workspace_id>',
                    description: 'Workspace ID',
                    required: true,
                })];
            _parseMessageChannelId_decorators = [(0, nest_commander_1.Option)({
                    flags: '-c, --message-channel-id [message_channel_id]',
                    description: 'Message Channel ID (optional - if not provided, all channels will be reset)',
                    required: false,
                })];
            __esDecorate(this, null, _parseWorkspaceId_decorators, { kind: "method", name: "parseWorkspaceId", static: false, private: false, access: { has: obj => "parseWorkspaceId" in obj, get: obj => obj.parseWorkspaceId }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _parseMessageChannelId_decorators, { kind: "method", name: "parseMessageChannelId", static: false, private: false, access: { has: obj => "parseMessageChannelId" in obj, get: obj => obj.parseMessageChannelId }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingResetChannelCommand = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager = __runInitializers(this, _instanceExtraInitializers);
        messageChannelRepository;
        messagingChannelSyncStatusService;
        messagingMessageCleanerService;
        logger = new common_1.Logger(MessagingResetChannelCommand.name);
        constructor(workspaceOrmManager, messageChannelRepository, messagingChannelSyncStatusService, messagingMessageCleanerService) {
            super();
            this.workspaceOrmManager = workspaceOrmManager;
            this.messageChannelRepository = messageChannelRepository;
            this.messagingChannelSyncStatusService = messagingChannelSyncStatusService;
            this.messagingMessageCleanerService = messagingMessageCleanerService;
        }
        async run(_passedParam, options) {
            const { workspaceId, messageChannelId } = options;
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                this.logger.log(`No message channel ID provided, resetting all message channels in workspace ${workspaceId}`);
                const messageChannels = await this.messageChannelRepository.find({
                    where: {
                        ...((0, utils_1.isDefined)(messageChannelId) ? { id: messageChannelId } : {}),
                        workspaceId,
                    },
                });
                if (messageChannels.length === 0) {
                    this.logger.log(`No message channels found in workspace ${workspaceId}`);
                    return;
                }
                this.logger.log(`Found ${messageChannels.length} message channels to reset`);
                for (const messageChannel of messageChannels) {
                    await this.messagingChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending([messageChannel.id], workspaceId);
                    await this.messagingMessageCleanerService.cleanOrphanMessagesAndThreads(workspaceId);
                }
                this.logger.log(`Successfully reset all ${messageChannels.length} message channels in workspace ${workspaceId}`);
            }, authContext, { lite: true });
        }
        parseWorkspaceId(value) {
            return value;
        }
        parseMessageChannelId(value) {
            return value;
        }
    };
    return MessagingResetChannelCommand = _classThis;
})();
exports.MessagingResetChannelCommand = MessagingResetChannelCommand;
