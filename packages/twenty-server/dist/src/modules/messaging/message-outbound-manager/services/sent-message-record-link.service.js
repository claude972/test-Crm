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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentMessageRecordLinkService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const get_target_field_name_for_object_record_util_1 = require("src/engine/core-modules/target/utils/get-target-field-name-for-object-record.util");
const record_permissions_service_1 = require("src/engine/metadata-modules/record-permissions/services/record-permissions.service");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
let SentMessageRecordLinkService = class SentMessageRecordLinkService {
    workspaceOrmManager;
    recordPermissionsService;
    constructor(workspaceOrmManager, recordPermissionsService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.recordPermissionsService = recordPermissionsService;
    }
    async linkSentMessageThreadToRecord({ authContext, messageThreadId, objectNameSingular, recordId, }) {
        const targetFieldName = (0, get_target_field_name_for_object_record_util_1.getTargetFieldNameForObjectRecord)(objectNameSingular);
        if (!(0, utils_1.isDefined)(targetFieldName)) {
            return;
        }
        // The link is written in a system context, so the caller's own access to this record, row-level rules included, gates it
        const permissionsByRecordId = await this.recordPermissionsService.getPermissionsForRecords({
            authContext,
            flatObjectMetadata: { nameSingular: objectNameSingular },
            recordIds: [recordId],
        });
        if (!permissionsByRecordId.get(recordId)?.canUpdate) {
            return;
        }
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageThreadTargetRepository = this.workspaceOrmManager.getRepository('messageThreadTarget', { shouldBypassPermissionChecks: true });
            const existingMessageThreadTarget = await messageThreadTargetRepository.findOne({
                where: { messageThreadId, [targetFieldName]: recordId },
            });
            if ((0, utils_1.isDefined)(existingMessageThreadTarget)) {
                if (!existingMessageThreadTarget.isManuallyAssigned) {
                    await messageThreadTargetRepository.update(existingMessageThreadTarget.id, { isManuallyAssigned: true });
                }
                return;
            }
            await messageThreadTargetRepository.insert({
                messageThreadId,
                [targetFieldName]: recordId,
                isAutomaticallyAssigned: false,
                isManuallyAssigned: true,
            });
        }, (0, build_system_auth_context_util_1.buildSystemAuthContext)(authContext.workspace.id));
    }
};
exports.SentMessageRecordLinkService = SentMessageRecordLinkService;
exports.SentMessageRecordLinkService = SentMessageRecordLinkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof record_permissions_service_1.RecordPermissionsService !== "undefined" && record_permissions_service_1.RecordPermissionsService) === "function" ? _b : Object])
], SentMessageRecordLinkService);
