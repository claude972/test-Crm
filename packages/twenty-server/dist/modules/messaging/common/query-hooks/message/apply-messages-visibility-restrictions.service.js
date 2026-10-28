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
exports.ApplyMessagesVisibilityRestrictionsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const is_application_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-application-auth-context.guard");
const is_user_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-user-auth-context.guard");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const RESTRICTED_MESSAGE_FIELD_NAMES = ['subject', 'text'];
let ApplyMessagesVisibilityRestrictionsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ApplyMessagesVisibilityRestrictionsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ApplyMessagesVisibilityRestrictionsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        commonRecordVisibilityService;
        messageChannelRepository;
        constructor(workspaceOrmManager, commonRecordVisibilityService, messageChannelRepository) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.commonRecordVisibilityService = commonRecordVisibilityService;
            this.messageChannelRepository = messageChannelRepository;
        }
        onModuleInit() {
            this.commonRecordVisibilityService.registerHandler({
                objectNameSingular: 'message',
                handler: this,
            });
        }
        async applyVisibilityRestrictions({ records, authContext, }) {
            const restrictableMessages = records.filter((message) => RESTRICTED_MESSAGE_FIELD_NAMES.some((fieldName) => fieldName in message));
            if (restrictableMessages.length === 0) {
                return;
            }
            const { fullyVisibleMessageIds, subjectVisibleMessageIds } = await this.findVisibleMessageIds({
                messages: restrictableMessages,
                authContext,
            });
            for (const message of restrictableMessages) {
                if (fullyVisibleMessageIds.has(message.id)) {
                    continue;
                }
                if ('text' in message) {
                    message.text = constants_1.FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
                }
                if (!subjectVisibleMessageIds.has(message.id) && 'subject' in message) {
                    message.subject = constants_1.FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
                }
            }
        }
        async findVisibleMessageIds({ messages, authContext, }) {
            const workspaceId = authContext.workspace.id;
            const fullyVisibleMessageIds = new Set();
            const subjectVisibleMessageIds = new Set();
            const messageIds = [
                ...new Set(messages.map((message) => message.id)),
            ].filter(utils_1.isDefined);
            if (messageIds.length === 0) {
                return { fullyVisibleMessageIds, subjectVisibleMessageIds };
            }
            const messageChannelMessageAssociations = await this.workspaceOrmManager.executeInWorkspaceContext(async () => this.workspaceOrmManager
                .getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true })
                .find({
                where: { messageId: (0, typeorm_1.In)(messageIds) },
            }), (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
            const messageChannelIds = [
                ...new Set(messageChannelMessageAssociations.map((association) => association.messageChannelId)),
            ];
            if (messageChannelIds.length === 0) {
                return { fullyVisibleMessageIds, subjectVisibleMessageIds };
            }
            const messageChannels = await this.messageChannelRepository.find({
                where: { id: (0, typeorm_1.In)(messageChannelIds), workspaceId },
                select: {
                    id: true,
                    visibility: true,
                    connectedAccount: {
                        id: true,
                        userWorkspaceId: true,
                        applicationId: true,
                    },
                },
                relations: { connectedAccount: true },
            });
            const messageChannelById = new Map(messageChannels.map((messageChannel) => [
                messageChannel.id,
                messageChannel,
            ]));
            for (const association of messageChannelMessageAssociations) {
                const messageChannel = messageChannelById.get(association.messageChannelId);
                if (!(0, utils_1.isDefined)(messageChannel)) {
                    continue;
                }
                if (messageChannel.visibility ===
                    types_1.MessageChannelVisibility.SHARE_EVERYTHING ||
                    this.isMessageChannelOwnedByViewer({ messageChannel, authContext })) {
                    fullyVisibleMessageIds.add(association.messageId);
                }
                else if (messageChannel.visibility === types_1.MessageChannelVisibility.SUBJECT) {
                    subjectVisibleMessageIds.add(association.messageId);
                }
            }
            return { fullyVisibleMessageIds, subjectVisibleMessageIds };
        }
        isMessageChannelOwnedByViewer({ messageChannel, authContext, }) {
            if ((0, is_user_auth_context_guard_1.isUserAuthContext)(authContext)) {
                return (messageChannel.connectedAccount.userWorkspaceId ===
                    authContext.userWorkspaceId);
            }
            // Email connections carry no applicationId, so an application only sees through channels it created itself
            if ((0, is_application_auth_context_guard_1.isApplicationAuthContext)(authContext)) {
                return (messageChannel.connectedAccount.applicationId ===
                    authContext.application.id);
            }
            return false;
        }
    };
    return ApplyMessagesVisibilityRestrictionsService = _classThis;
})();
exports.ApplyMessagesVisibilityRestrictionsService = ApplyMessagesVisibilityRestrictionsService;
