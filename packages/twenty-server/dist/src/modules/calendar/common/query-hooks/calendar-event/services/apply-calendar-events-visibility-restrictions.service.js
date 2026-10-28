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
exports.ApplyCalendarEventsVisibilityRestrictionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const common_record_visibility_service_1 = require("src/engine/api/common/common-record-visibility/common-record-visibility.service");
const is_user_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-user-auth-context.guard");
const calendar_channel_entity_1 = require("src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const RESTRICTED_CALENDAR_EVENT_FIELD_NAMES = ['title', 'description'];
let ApplyCalendarEventsVisibilityRestrictionsService = class ApplyCalendarEventsVisibilityRestrictionsService {
    workspaceOrmManager;
    commonRecordVisibilityService;
    calendarChannelRepository;
    constructor(workspaceOrmManager, commonRecordVisibilityService, calendarChannelRepository) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.commonRecordVisibilityService = commonRecordVisibilityService;
        this.calendarChannelRepository = calendarChannelRepository;
    }
    onModuleInit() {
        this.commonRecordVisibilityService.registerHandler({
            objectNameSingular: 'calendarEvent',
            handler: this,
        });
    }
    async applyVisibilityRestrictions({ records, authContext, }) {
        const restrictableCalendarEvents = records.filter((calendarEvent) => RESTRICTED_CALENDAR_EVENT_FIELD_NAMES.some((fieldName) => fieldName in calendarEvent));
        if (restrictableCalendarEvents.length === 0) {
            return;
        }
        const visibleCalendarEventIds = await this.findVisibleCalendarEventIds({
            calendarEvents: restrictableCalendarEvents,
            authContext,
        });
        for (const calendarEvent of restrictableCalendarEvents) {
            if (visibleCalendarEventIds.has(calendarEvent.id)) {
                continue;
            }
            for (const fieldName of RESTRICTED_CALENDAR_EVENT_FIELD_NAMES) {
                if (fieldName in calendarEvent) {
                    calendarEvent[fieldName] =
                        constants_1.FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED;
                }
            }
        }
    }
    async findVisibleCalendarEventIds({ calendarEvents, authContext, }) {
        const workspaceId = authContext.workspace.id;
        const calendarEventIds = [
            ...new Set(calendarEvents.map((calendarEvent) => calendarEvent.id)),
        ].filter(utils_1.isDefined);
        if (calendarEventIds.length === 0) {
            return new Set();
        }
        const calendarChannelEventAssociations = await this.workspaceOrmManager.executeInWorkspaceContext(async () => this.workspaceOrmManager
            .getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true })
            .find({
            where: { calendarEventId: (0, typeorm_2.In)(calendarEventIds) },
        }), (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
        const calendarChannelIds = [
            ...new Set(calendarChannelEventAssociations.map((association) => association.calendarChannelId)),
        ];
        if (calendarChannelIds.length === 0) {
            return new Set();
        }
        const calendarChannels = await this.calendarChannelRepository.find({
            where: { id: (0, typeorm_2.In)(calendarChannelIds), workspaceId },
            select: {
                id: true,
                visibility: true,
                connectedAccount: { id: true, userWorkspaceId: true },
            },
            relations: { connectedAccount: true },
        });
        const viewerUserWorkspaceId = (0, is_user_auth_context_guard_1.isUserAuthContext)(authContext)
            ? authContext.userWorkspaceId
            : undefined;
        const visibleCalendarChannelIds = new Set(calendarChannels
            .filter((calendarChannel) => calendarChannel.visibility ===
            types_1.CalendarChannelVisibility.SHARE_EVERYTHING ||
            ((0, utils_1.isDefined)(viewerUserWorkspaceId) &&
                calendarChannel.connectedAccount.userWorkspaceId ===
                    viewerUserWorkspaceId))
            .map((calendarChannel) => calendarChannel.id));
        return new Set(calendarChannelEventAssociations
            .filter((association) => visibleCalendarChannelIds.has(association.calendarChannelId))
            .map((association) => association.calendarEventId));
    }
};
exports.ApplyCalendarEventsVisibilityRestrictionsService = ApplyCalendarEventsVisibilityRestrictionsService;
exports.ApplyCalendarEventsVisibilityRestrictionsService = ApplyCalendarEventsVisibilityRestrictionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(calendar_channel_entity_1.CalendarChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof common_record_visibility_service_1.CommonRecordVisibilityService !== "undefined" && common_record_visibility_service_1.CommonRecordVisibilityService) === "function" ? _b : Object, typeorm_2.Repository])
], ApplyCalendarEventsVisibilityRestrictionsService);
