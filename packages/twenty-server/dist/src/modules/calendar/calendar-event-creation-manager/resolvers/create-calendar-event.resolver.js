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
var CreateCalendarEventResolver_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCalendarEventResolver = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const constants_1 = require("kovaa-lab-shared/constants");
const metadata_resolver_decorator_1 = require("src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator");
const auth_graphql_api_exception_filter_1 = require("src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter");
const resolver_validation_pipe_1 = require("src/engine/core-modules/graphql/pipes/resolver-validation.pipe");
const i18n_service_1 = require("src/engine/core-modules/i18n/i18n.service");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const auth_user_workspace_id_decorator_1 = require("src/engine/decorators/auth/auth-user-workspace-id.decorator");
const auth_workspace_decorator_1 = require("src/engine/decorators/auth/auth-workspace.decorator");
const settings_permission_guard_1 = require("src/engine/guards/settings-permission.guard");
const auth_principal_guard_1 = require("src/engine/guards/auth-principal.guard");
const connected_account_metadata_service_1 = require("src/engine/metadata-modules/connected-account/connected-account-metadata.service");
const create_calendar_event_output_dto_1 = require("src/modules/calendar/calendar-event-creation-manager/dtos/create-calendar-event-output.dto");
const create_calendar_event_input_1 = require("src/modules/calendar/calendar-event-creation-manager/dtos/create-calendar-event.input");
const calendar_event_composer_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-event-composer.service");
const create_calendar_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service");
const custom_exception_1 = require("src/utils/custom-exception");
let CreateCalendarEventResolver = CreateCalendarEventResolver_1 = class CreateCalendarEventResolver {
    connectedAccountMetadataService;
    calendarEventComposerService;
    createCalendarEventService;
    i18nService;
    logger = new common_1.Logger(CreateCalendarEventResolver_1.name);
    constructor(connectedAccountMetadataService, calendarEventComposerService, createCalendarEventService, i18nService) {
        this.connectedAccountMetadataService = connectedAccountMetadataService;
        this.calendarEventComposerService = calendarEventComposerService;
        this.createCalendarEventService = createCalendarEventService;
        this.i18nService = i18nService;
    }
    async createCalendarEvent(input, workspace, userWorkspaceId, context) {
        try {
            await this.connectedAccountMetadataService.verifyUsableByCaller({
                id: input.connectedAccountId,
                userWorkspaceId,
                workspaceId: workspace.id,
            });
            const result = await this.calendarEventComposerService.composeCalendarEvent({
                connectedAccountId: input.connectedAccountId,
                title: input.title,
                description: input.description,
                location: input.location,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                isFullDay: input.isFullDay,
                timeZone: input.timeZone,
                attendees: input.attendees,
                sendInvitations: input.sendInvitations,
                addConferencing: input.addConferencing,
            }, workspace.id);
            if (!result.success) {
                return {
                    success: false,
                    error: this.i18nService
                        .getI18nInstance(context.req.locale)
                        ._(result.error),
                };
            }
            const createdEvent = await this.createCalendarEventService.createComposedCalendarEvent(result.data);
            const calendarEventId = await this.createCalendarEventService.persistCalendarEvent(createdEvent, result.data, workspace.id);
            return {
                success: true,
                iCalUid: createdEvent.iCalUid || undefined,
                conferenceLink: createdEvent.conferenceLinkUrl || undefined,
                calendarEventId: calendarEventId ?? undefined,
            };
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            this.logger.error(`Failed to create calendar event: ${error}`);
            if (error instanceof custom_exception_1.CustomException) {
                return {
                    success: false,
                    error: this.i18nService
                        .getI18nInstance(context.req.locale)
                        ._(error.userFriendlyMessage),
                };
            }
            return { success: false };
        }
    }
};
exports.CreateCalendarEventResolver = CreateCalendarEventResolver;
__decorate([
    (0, graphql_1.Mutation)(() => create_calendar_event_output_dto_1.CreateCalendarEventOutputDTO),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, auth_workspace_decorator_1.AuthWorkspace)()),
    __param(2, (0, auth_user_workspace_id_decorator_1.AuthUserWorkspaceId)()),
    __param(3, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof create_calendar_event_input_1.CreateCalendarEventInput !== "undefined" && create_calendar_event_input_1.CreateCalendarEventInput) === "function" ? _c : Object, workspace_entity_1.WorkspaceEntity, String, Object]),
    __metadata("design:returntype", Promise)
], CreateCalendarEventResolver.prototype, "createCalendarEvent", null);
exports.CreateCalendarEventResolver = CreateCalendarEventResolver = CreateCalendarEventResolver_1 = __decorate([
    (0, metadata_resolver_decorator_1.MetadataResolver)(),
    (0, common_1.UsePipes)(resolver_validation_pipe_1.ResolverValidationPipe),
    (0, common_1.UseFilters)(auth_graphql_api_exception_filter_1.AuthGraphqlApiExceptionFilter),
    (0, common_1.UseGuards)((0, auth_principal_guard_1.AuthPrincipalGuard)({
        userSession: {
            standard: true,
            impersonated: true,
            playground: true,
            workspaceAgnostic: false,
        },
        apiKey: true,
        oauthClient: true,
        application: true,
    }), (0, settings_permission_guard_1.SettingsPermissionGuard)(constants_1.PermissionFlagType.CREATE_CALENDAR_EVENT_TOOL)),
    __metadata("design:paramtypes", [typeof (_a = typeof connected_account_metadata_service_1.ConnectedAccountMetadataService !== "undefined" && connected_account_metadata_service_1.ConnectedAccountMetadataService) === "function" ? _a : Object, calendar_event_composer_service_1.CalendarEventComposerService,
        create_calendar_event_service_1.CreateCalendarEventService, typeof (_b = typeof i18n_service_1.I18nService !== "undefined" && i18n_service_1.I18nService) === "function" ? _b : Object])
], CreateCalendarEventResolver);
