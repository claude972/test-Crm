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
exports.CreateCalendarEventResolver = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const constants_1 = require("kovaa-lab-shared/constants");
const metadata_resolver_decorator_1 = require("src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator");
const auth_graphql_api_exception_filter_1 = require("src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter");
const resolver_validation_pipe_1 = require("src/engine/core-modules/graphql/pipes/resolver-validation.pipe");
const settings_permission_guard_1 = require("src/engine/guards/settings-permission.guard");
const auth_principal_guard_1 = require("src/engine/guards/auth-principal.guard");
const create_calendar_event_output_dto_1 = require("src/modules/calendar/calendar-event-creation-manager/dtos/create-calendar-event-output.dto");
const custom_exception_1 = require("src/utils/custom-exception");
let CreateCalendarEventResolver = (() => {
    let _classDecorators = [(0, metadata_resolver_decorator_1.MetadataResolver)(), (0, common_1.UsePipes)(resolver_validation_pipe_1.ResolverValidationPipe), (0, common_1.UseFilters)(auth_graphql_api_exception_filter_1.AuthGraphqlApiExceptionFilter), (0, common_1.UseGuards)((0, auth_principal_guard_1.AuthPrincipalGuard)({
            userSession: {
                standard: true,
                impersonated: true,
                playground: true,
                workspaceAgnostic: false,
            },
            apiKey: true,
            oauthClient: true,
            application: true,
        }), (0, settings_permission_guard_1.SettingsPermissionGuard)(constants_1.PermissionFlagType.CREATE_CALENDAR_EVENT_TOOL))];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createCalendarEvent_decorators;
    var CreateCalendarEventResolver = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _createCalendarEvent_decorators = [(0, graphql_1.Mutation)(() => create_calendar_event_output_dto_1.CreateCalendarEventOutputDTO)];
            __esDecorate(this, null, _createCalendarEvent_decorators, { kind: "method", name: "createCalendarEvent", static: false, private: false, access: { has: obj => "createCalendarEvent" in obj, get: obj => obj.createCalendarEvent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CreateCalendarEventResolver = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        connectedAccountMetadataService = __runInitializers(this, _instanceExtraInitializers);
        calendarEventComposerService;
        createCalendarEventService;
        i18nService;
        logger = new common_1.Logger(CreateCalendarEventResolver.name);
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
    return CreateCalendarEventResolver = _classThis;
})();
exports.CreateCalendarEventResolver = CreateCalendarEventResolver;
