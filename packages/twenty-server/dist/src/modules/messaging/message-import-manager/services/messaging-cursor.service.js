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
exports.MessagingCursorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const is_sync_cursor_newer_util_1 = require("src/modules/messaging/message-import-manager/utils/is-sync-cursor-newer.util");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let MessagingCursorService = class MessagingCursorService {
    workspaceOrmManager;
    messageChannelRepository;
    messageFolderRepository;
    constructor(workspaceOrmManager, messageChannelRepository, messageFolderRepository) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageFolderRepository = messageFolderRepository;
    }
    async updateCursor(messageChannel, nextSyncCursor, workspaceId, folderId) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            if (!folderId) {
                await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                    throttleFailureCount: 0,
                    throttleRetryAfter: null,
                    syncStageStartedAt: null,
                    syncCursor: (0, is_sync_cursor_newer_util_1.isSyncCursorNewer)(nextSyncCursor, messageChannel.syncCursor)
                        ? nextSyncCursor
                        : messageChannel.syncCursor,
                });
            }
            else {
                await this.messageFolderRepository.update(workspaceId, { id: folderId }, {
                    syncCursor: nextSyncCursor,
                });
                await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                    throttleFailureCount: 0,
                    throttleRetryAfter: null,
                    syncStageStartedAt: null,
                });
            }
        }, authContext, { lite: true });
    }
};
exports.MessagingCursorService = MessagingCursorService;
exports.MessagingCursorService = MessagingCursorService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(2, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _b : Object])
], MessagingCursorService);
