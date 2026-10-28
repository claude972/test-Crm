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
exports.MessagingImportManagerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const email_alias_manager_module_1 = require("src/modules/connected-account/email-alias-manager/email-alias-manager.module");
const messaging_common_module_1 = require("src/modules/messaging/common/messaging-common.module");
const messaging_message_cleaner_module_1 = require("src/modules/messaging/message-cleaner/messaging-message-cleaner.module");
const messaging_folder_sync_manager_module_1 = require("src/modules/messaging/message-folder-manager/messaging-folder-sync-manager.module");
const messaging_trigger_message_list_fetch_command_1 = require("src/modules/messaging/message-import-manager/commands/messaging-trigger-message-list-fetch.command");
const messaging_message_list_fetch_cron_command_1 = require("src/modules/messaging/message-import-manager/crons/commands/messaging-message-list-fetch.cron.command");
const messaging_messages_import_cron_command_1 = require("src/modules/messaging/message-import-manager/crons/commands/messaging-messages-import.cron.command");
const messaging_ongoing_stale_cron_command_1 = require("src/modules/messaging/message-import-manager/crons/commands/messaging-ongoing-stale.cron.command");
const messaging_relaunch_failed_message_channels_cron_command_1 = require("src/modules/messaging/message-import-manager/crons/commands/messaging-relaunch-failed-message-channels.cron.command");
const messaging_message_list_fetch_cron_job_1 = require("src/modules/messaging/message-import-manager/crons/jobs/messaging-message-list-fetch.cron.job");
const messaging_messages_import_cron_job_1 = require("src/modules/messaging/message-import-manager/crons/jobs/messaging-messages-import.cron.job");
const messaging_ongoing_stale_cron_job_1 = require("src/modules/messaging/message-import-manager/crons/jobs/messaging-ongoing-stale.cron.job");
const messaging_relaunch_failed_message_channels_cron_job_1 = require("src/modules/messaging/message-import-manager/crons/jobs/messaging-relaunch-failed-message-channels.cron.job");
const messaging_gmail_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/messaging-gmail-driver.module");
const messaging_imap_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/imap/messaging-imap-driver.module");
const messaging_inbound_email_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/messaging-inbound-email-driver.module");
const inbound_email_import_service_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-import.service");
const messaging_microsoft_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/messaging-microsoft-driver.module");
const messaging_clean_cache_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-clean-cache");
const messaging_inbound_email_import_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-inbound-email-import.job");
const messaging_message_list_fetch_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-message-list-fetch.job");
const messaging_messages_import_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-messages-import.job");
const messaging_ongoing_stale_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-ongoing-stale.job");
const messaging_relaunch_failed_message_channel_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-relaunch-failed-message-channel.job");
const messaging_cursor_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-cursor.service");
const messaging_delete_folder_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-delete-folder-messages.service");
const messaging_delete_group_email_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-delete-group-email-messages.service");
const messaging_import_folder_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-folder-messages.service");
const messaging_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-get-message-list.service");
const messaging_get_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-get-messages.service");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const messaging_message_folder_association_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message-folder-association.service");
const messaging_message_list_fetch_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message-list-fetch.service");
const messaging_message_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message.service");
const messaging_messages_import_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-messages-import.service");
const messaging_process_folder_actions_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-process-folder-actions.service");
const messaging_process_group_email_actions_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-process-group-email-actions.service");
const messaging_save_messages_and_enqueue_contact_creation_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
const message_participant_manager_module_1 = require("src/modules/messaging/message-participant-manager/message-participant-manager.module");
const messaging_monitoring_module_1 = require("src/modules/messaging/monitoring/messaging-monitoring.module");
const blocklist_repository_1 = require("src/modules/blocklist/repositories/blocklist.repository");
let MessagingImportManagerModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                messaging_gmail_driver_module_1.MessagingGmailDriverModule,
                messaging_microsoft_driver_module_1.MessagingMicrosoftDriverModule,
                messaging_imap_driver_module_1.MessagingIMAPDriverModule,
                messaging_inbound_email_driver_module_1.MessagingInboundEmailDriverModule,
                messaging_common_module_1.MessagingCommonModule,
                typeorm_1.TypeOrmModule.forFeature([
                    workspace_entity_1.WorkspaceEntity,
                    message_channel_entity_1.MessageChannelEntity,
                    message_folder_entity_1.MessageFolderEntity,
                    user_workspace_entity_1.UserWorkspaceEntity,
                    connected_account_entity_1.ConnectedAccountEntity,
                ]),
                email_alias_manager_module_1.EmailAliasManagerModule,
                message_participant_manager_module_1.MessageParticipantManagerModule,
                messaging_folder_sync_manager_module_1.MessagingFolderSyncManagerModule,
                messaging_monitoring_module_1.MessagingMonitoringModule,
                messaging_message_cleaner_module_1.MessagingMessageCleanerModule,
            ],
            providers: [
                blocklist_repository_1.BlocklistRepository,
                (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_channel_entity_1.MessageChannelEntity),
                messaging_message_list_fetch_cron_command_1.MessagingMessageListFetchCronCommand,
                messaging_messages_import_cron_command_1.MessagingMessagesImportCronCommand,
                messaging_ongoing_stale_cron_command_1.MessagingOngoingStaleCronCommand,
                messaging_relaunch_failed_message_channels_cron_command_1.MessagingRelaunchFailedMessageChannelsCronCommand,
                messaging_trigger_message_list_fetch_command_1.MessagingTriggerMessageListFetchCommand,
                messaging_message_list_fetch_job_1.MessagingMessageListFetchJob,
                messaging_messages_import_job_1.MessagingMessagesImportJob,
                messaging_ongoing_stale_job_1.MessagingOngoingStaleJob,
                messaging_relaunch_failed_message_channel_job_1.MessagingRelaunchFailedMessageChannelJob,
                messaging_message_list_fetch_cron_job_1.MessagingMessageListFetchCronJob,
                messaging_messages_import_cron_job_1.MessagingMessagesImportCronJob,
                messaging_ongoing_stale_cron_job_1.MessagingOngoingStaleCronJob,
                messaging_relaunch_failed_message_channels_cron_job_1.MessagingRelaunchFailedMessageChannelsCronJob,
                messaging_clean_cache_1.MessagingCleanCacheJob,
                messaging_inbound_email_import_job_1.MessagingInboundEmailImportJob,
                messaging_message_service_1.MessagingMessageService,
                messaging_message_folder_association_service_1.MessagingMessageFolderAssociationService,
                messaging_message_list_fetch_service_1.MessagingMessageListFetchService,
                messaging_messages_import_service_1.MessagingMessagesImportService,
                messaging_save_messages_and_enqueue_contact_creation_service_1.MessagingSaveMessagesAndEnqueueContactCreationService,
                messaging_get_message_list_service_1.MessagingGetMessageListService,
                messaging_get_messages_service_1.MessagingGetMessagesService,
                messaging_import_exception_handler_service_1.MessageImportExceptionHandlerService,
                messaging_cursor_service_1.MessagingCursorService,
                messaging_process_folder_actions_service_1.MessagingProcessFolderActionsService,
                messaging_process_group_email_actions_service_1.MessagingProcessGroupEmailActionsService,
                messaging_delete_folder_messages_service_1.MessagingDeleteFolderMessagesService,
                messaging_import_folder_messages_service_1.MessagingImportFolderMessagesService,
                messaging_delete_group_email_messages_service_1.MessagingDeleteGroupEmailMessagesService,
                inbound_email_import_service_1.InboundEmailImportService,
                (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity),
            ],
            exports: [
                messaging_message_list_fetch_cron_command_1.MessagingMessageListFetchCronCommand,
                messaging_messages_import_cron_command_1.MessagingMessagesImportCronCommand,
                messaging_ongoing_stale_cron_command_1.MessagingOngoingStaleCronCommand,
                messaging_relaunch_failed_message_channels_cron_command_1.MessagingRelaunchFailedMessageChannelsCronCommand,
                messaging_process_group_email_actions_service_1.MessagingProcessGroupEmailActionsService,
                messaging_save_messages_and_enqueue_contact_creation_service_1.MessagingSaveMessagesAndEnqueueContactCreationService,
                messaging_messages_import_service_1.MessagingMessagesImportService,
                messaging_message_list_fetch_service_1.MessagingMessageListFetchService,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingImportManagerModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingImportManagerModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return MessagingImportManagerModule = _classThis;
})();
exports.MessagingImportManagerModule = MessagingImportManagerModule;
