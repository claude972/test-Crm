"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingCommonModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const metrics_module_1 = require("src/engine/core-modules/metrics/metrics.module");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const connected_account_module_1 = require("src/modules/connected-account/connected-account.module");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
let MessagingCommonModule = class MessagingCommonModule {
};
exports.MessagingCommonModule = MessagingCommonModule;
exports.MessagingCommonModule = MessagingCommonModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                message_channel_entity_1.MessageChannelEntity,
                message_folder_entity_1.MessageFolderEntity,
                connected_account_entity_1.ConnectedAccountEntity,
                user_workspace_entity_1.UserWorkspaceEntity,
            ]),
            connected_account_module_1.ConnectedAccountModule,
            metrics_module_1.MetricsModule,
        ],
        providers: [
            message_channel_sync_status_service_1.MessageChannelSyncStatusService,
            (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity),
        ],
        exports: [message_channel_sync_status_service_1.MessageChannelSyncStatusService],
    })
], MessagingCommonModule);
