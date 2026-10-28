"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventImportManagerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const feature_flag_module_1 = require("src/engine/core-modules/feature-flag/feature-flag.module");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
const calendar_event_cleaner_module_1 = require("src/modules/calendar/calendar-event-cleaner/calendar-event-cleaner.module");
const calendar_common_module_1 = require("src/modules/calendar/common/calendar-common.module");
const calendar_trigger_event_list_fetch_command_1 = require("src/modules/calendar/calendar-event-import-manager/commands/calendar-trigger-event-list-fetch.command");
const calendar_event_list_fetch_cron_command_1 = require("src/modules/calendar/calendar-event-import-manager/crons/commands/calendar-event-list-fetch.cron.command");
const calendar_import_cron_command_1 = require("src/modules/calendar/calendar-event-import-manager/crons/commands/calendar-import.cron.command");
const calendar_ongoing_stale_cron_command_1 = require("src/modules/calendar/calendar-event-import-manager/crons/commands/calendar-ongoing-stale.cron.command");
const calendar_relaunch_failed_calendar_channels_cron_command_1 = require("src/modules/calendar/calendar-event-import-manager/crons/commands/calendar-relaunch-failed-calendar-channels.cron.command");
const calendar_event_list_fetch_cron_job_1 = require("src/modules/calendar/calendar-event-import-manager/crons/jobs/calendar-event-list-fetch.cron.job");
const calendar_events_import_cron_job_1 = require("src/modules/calendar/calendar-event-import-manager/crons/jobs/calendar-events-import.cron.job");
const calendar_ongoing_stale_cron_job_1 = require("src/modules/calendar/calendar-event-import-manager/crons/jobs/calendar-ongoing-stale.cron.job");
const calendar_relaunch_failed_calendar_channels_cron_job_1 = require("src/modules/calendar/calendar-event-import-manager/crons/jobs/calendar-relaunch-failed-calendar-channels.cron.job");
const caldav_driver_module_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/caldav-driver.module");
const google_calendar_driver_module_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/google-calendar-driver.module");
const microsoft_calendar_driver_module_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/microsoft-calendar/microsoft-calendar-driver.module");
const calendar_event_list_fetch_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-event-list-fetch.job");
const calendar_events_import_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-events-import.job");
const calendar_ongoing_stale_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-ongoing-stale.job");
const calendar_relaunch_failed_calendar_channel_job_1 = require("src/modules/calendar/calendar-event-import-manager/jobs/calendar-relaunch-failed-calendar-channel.job");
const calendar_event_import_exception_handler_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service");
const calendar_events_import_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-events-import.service");
const calendar_fetch_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-fetch-events.service");
const calendar_get_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-get-events.service");
const calendar_import_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-import-events.service");
const calendar_save_events_service_1 = require("src/modules/calendar/calendar-event-import-manager/services/calendar-save-events.service");
const calendar_event_participant_manager_module_1 = require("src/modules/calendar/calendar-event-participant-manager/calendar-event-participant-manager.module");
const email_alias_manager_module_1 = require("src/modules/connected-account/email-alias-manager/email-alias-manager.module");
const blocklist_repository_1 = require("src/modules/blocklist/repositories/blocklist.repository");
let CalendarEventImportManagerModule = class CalendarEventImportManagerModule {
};
exports.CalendarEventImportManagerModule = CalendarEventImportManagerModule;
exports.CalendarEventImportManagerModule = CalendarEventImportManagerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            calendar_event_participant_manager_module_1.CalendarEventParticipantManagerModule,
            typeorm_1.TypeOrmModule.forFeature([
                workspace_entity_1.WorkspaceEntity,
                calendar_channel_entity_1.CalendarChannelEntity,
                connected_account_entity_1.ConnectedAccountEntity,
                user_workspace_entity_1.UserWorkspaceEntity,
            ]),
            calendar_event_cleaner_module_1.CalendarEventCleanerModule,
            calendar_common_module_1.CalendarCommonModule,
            google_calendar_driver_module_1.GoogleCalendarDriverModule,
            caldav_driver_module_1.CalDavDriverModule,
            microsoft_calendar_driver_module_1.MicrosoftCalendarDriverModule,
            email_alias_manager_module_1.EmailAliasManagerModule,
            feature_flag_module_1.FeatureFlagModule,
        ],
        providers: [
            blocklist_repository_1.BlocklistRepository,
            (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(calendar_channel_entity_1.CalendarChannelEntity),
            calendar_events_import_service_1.CalendarEventsImportService,
            calendar_fetch_events_service_1.CalendarFetchEventsService,
            calendar_event_import_exception_handler_service_1.CalendarEventImportErrorHandlerService,
            calendar_get_events_service_1.CalendarGetCalendarEventsService,
            calendar_import_events_service_1.CalendarImportEventsService,
            calendar_save_events_service_1.CalendarSaveEventsService,
            calendar_event_list_fetch_cron_job_1.CalendarEventListFetchCronJob,
            calendar_event_list_fetch_cron_command_1.CalendarEventListFetchCronCommand,
            calendar_event_list_fetch_job_1.CalendarEventListFetchJob,
            calendar_events_import_cron_job_1.CalendarEventsImportCronJob,
            calendar_import_cron_command_1.CalendarEventsImportCronCommand,
            calendar_events_import_job_1.CalendarEventsImportJob,
            calendar_ongoing_stale_cron_job_1.CalendarOngoingStaleCronJob,
            calendar_ongoing_stale_cron_command_1.CalendarOngoingStaleCronCommand,
            calendar_trigger_event_list_fetch_command_1.CalendarTriggerEventListFetchCommand,
            calendar_ongoing_stale_job_1.CalendarOngoingStaleJob,
            calendar_relaunch_failed_calendar_channels_cron_job_1.CalendarRelaunchFailedCalendarChannelsCronJob,
            calendar_relaunch_failed_calendar_channels_cron_command_1.CalendarRelaunchFailedCalendarChannelsCronCommand,
            calendar_relaunch_failed_calendar_channel_job_1.CalendarRelaunchFailedCalendarChannelJob,
        ],
        exports: [
            calendar_events_import_service_1.CalendarEventsImportService,
            calendar_fetch_events_service_1.CalendarFetchEventsService,
            calendar_save_events_service_1.CalendarSaveEventsService,
            calendar_event_list_fetch_cron_command_1.CalendarEventListFetchCronCommand,
            calendar_import_cron_command_1.CalendarEventsImportCronCommand,
            calendar_ongoing_stale_cron_command_1.CalendarOngoingStaleCronCommand,
            calendar_relaunch_failed_calendar_channels_cron_command_1.CalendarRelaunchFailedCalendarChannelsCronCommand,
        ],
    })
], CalendarEventImportManagerModule);
