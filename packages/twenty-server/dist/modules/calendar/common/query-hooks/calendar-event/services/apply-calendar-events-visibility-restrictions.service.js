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
exports.ApplyCalendarEventsVisibilityRestrictionsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const is_user_auth_context_guard_1 = require("src/engine/core-modules/auth/guards/is-user-auth-context.guard");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const RESTRICTED_CALENDAR_EVENT_FIELD_NAMES = ['title', 'description'];
let ApplyCalendarEventsVisibilityRestrictionsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ApplyCalendarEventsVisibilityRestrictionsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ApplyCalendarEventsVisibilityRestrictionsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
                where: { calendarEventId: (0, typeorm_1.In)(calendarEventIds) },
            }), (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId), { lite: true });
            const calendarChannelIds = [
                ...new Set(calendarChannelEventAssociations.map((association) => association.calendarChannelId)),
            ];
            if (calendarChannelIds.length === 0) {
                return new Set();
            }
            const calendarChannels = await this.calendarChannelRepository.find({
                where: { id: (0, typeorm_1.In)(calendarChannelIds), workspaceId },
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
    return ApplyCalendarEventsVisibilityRestrictionsService = _classThis;
})();
exports.ApplyCalendarEventsVisibilityRestrictionsService = ApplyCalendarEventsVisibilityRestrictionsService;
