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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageFolderAssociationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const build_message_folder_associations_to_insert_util_1 = require("src/modules/messaging/message-import-manager/utils/build-message-folder-associations-to-insert.util");
let MessagingMessageFolderAssociationService = class MessagingMessageFolderAssociationService {
    workspaceOrmManager;
    constructor(workspaceOrmManager) {
        this.workspaceOrmManager = workspaceOrmManager;
    }
    async saveMessageFolderAssociations(associations, workspaceId, transactionScope) {
        const associationIds = [
            ...new Set(associations
                .filter((association) => association.messageFolderIds.length > 0)
                .map((association) => association.messageChannelMessageAssociationId)),
        ];
        if (associationIds.length === 0) {
            return;
        }
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const repository = transactionScope.getRepository('messageChannelMessageAssociationMessageFolder', { shouldBypassPermissionChecks: true });
            const existingRecords = await repository.find({
                where: {
                    messageChannelMessageAssociationId: (0, typeorm_1.In)(associationIds),
                },
            });
            const recordsToInsert = (0, build_message_folder_associations_to_insert_util_1.buildMessageFolderAssociationsToInsert)({
                associations,
                existingRecords,
            });
            if (recordsToInsert.length > 0) {
                await repository.insert(recordsToInsert);
            }
        }, authContext, { lite: true });
    }
};
exports.MessagingMessageFolderAssociationService = MessagingMessageFolderAssociationService;
exports.MessagingMessageFolderAssociationService = MessagingMessageFolderAssociationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object])
], MessagingMessageFolderAssociationService);
