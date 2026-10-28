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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyMessagesVisibilityRestrictionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const common_record_visibility_service_1 = require("src/engine/api/common/common-record-visibility/common-record-visibility.service");
const is_application_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-application-auth-context.guard");
const is_user_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-user-auth-context.guard");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const RESTRICTED_MESSAGE_FIELD_NAMES = ['subject', 'text'];
let ApplyMessagesVisibilityRestrictionsService = class ApplyMessagesVisibilityRestrictionsService {
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
            where: { messageId: (0, typeorm_2.In)(messageIds) },
        }), (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
        const messageChannelIds = [
            ...new Set(messageChannelMessageAssociations.map((association) => association.messageChannelId)),
        ];
        if (messageChannelIds.length === 0) {
            return { fullyVisibleMessageIds, subjectVisibleMessageIds };
        }
        const messageChannels = await this.messageChannelRepository.find({
            where: { id: (0, typeorm_2.In)(messageChannelIds), workspaceId },
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
exports.ApplyMessagesVisibilityRestrictionsService = ApplyMessagesVisibilityRestrictionsService;
exports.ApplyMessagesVisibilityRestrictionsService = ApplyMessagesVisibilityRestrictionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof common_record_visibility_service_1.CommonRecordVisibilityService !== "undefined" && common_record_visibility_service_1.CommonRecordVisibilityService) === "function" ? _b : Object, typeorm_2.Repository])
], ApplyMessagesVisibilityRestrictionsService);
