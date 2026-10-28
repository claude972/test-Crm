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
exports.CalendarEventCleanerService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const CALENDAR_CLEANUP_PAGE_SIZE = 500;
let CalendarEventCleanerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CalendarEventCleanerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CalendarEventCleanerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        logger = new common_1.Logger(CalendarEventCleanerService.name);
        constructor(workspaceOrmManager) {
            this.workspaceOrmManager = workspaceOrmManager;
        }
        async deleteCalendarChannelEventAssociationsByChannelId({ workspaceId, calendarChannelId, }) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const calendarChannelEventAssociationRepository = transactionScope.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                    for (;;) {
                        const associations = await calendarChannelEventAssociationRepository.find({
                            where: { calendarChannelId },
                            take: CALENDAR_CLEANUP_PAGE_SIZE,
                            select: { id: true },
                        });
                        if (associations.length === 0) {
                            break;
                        }
                        const ids = associations.map(({ id }) => id);
                        this.logger.log(`WorkspaceId: ${workspaceId} Deleting ${ids.length} calendar channel event associations for channel ${calendarChannelId}`);
                        await calendarChannelEventAssociationRepository.delete(ids);
                    }
                });
            }, authContext, { lite: true });
        }
        async deleteOrphanedCalendarEvents({ calendarEventIds, workspaceId, }) {
            if (calendarEventIds.length === 0) {
                return;
            }
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const calendarEventRepository = transactionScope.getRepository('calendarEvent', { shouldBypassPermissionChecks: true });
                    const calendarChannelEventAssociationRepository = transactionScope.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                    for (let index = 0; index < calendarEventIds.length; index += CALENDAR_CLEANUP_PAGE_SIZE) {
                        const pageIds = calendarEventIds.slice(index, index + CALENDAR_CLEANUP_PAGE_SIZE);
                        const associations = await calendarChannelEventAssociationRepository.find({
                            where: { calendarEventId: (0, typeorm_1.In)(pageIds) },
                            select: { calendarEventId: true },
                        });
                        const referencedEventIds = new Set(associations.map(({ calendarEventId }) => calendarEventId));
                        const orphanEventIds = pageIds.filter((eventId) => !referencedEventIds.has(eventId));
                        if (orphanEventIds.length > 0) {
                            await calendarEventRepository.delete(orphanEventIds);
                        }
                    }
                });
            }, authContext, { lite: true });
        }
        async cleanWorkspaceCalendarEvents(workspaceId) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const calendarEventRepository = transactionScope.getRepository('calendarEvent', { shouldBypassPermissionChecks: true });
                    const calendarChannelEventAssociationRepository = transactionScope.getRepository('calendarChannelEventAssociation', { shouldBypassPermissionChecks: true });
                    let cursor;
                    for (;;) {
                        const page = await calendarEventRepository.find({
                            where: (0, utils_1.isDefined)(cursor) ? { id: (0, typeorm_1.MoreThan)(cursor) } : {},
                            order: { id: 'ASC' },
                            take: CALENDAR_CLEANUP_PAGE_SIZE,
                            select: { id: true },
                        });
                        if (page.length === 0) {
                            break;
                        }
                        cursor = page[page.length - 1].id;
                        const pageIds = page.map(({ id }) => id);
                        const associations = await calendarChannelEventAssociationRepository.find({
                            where: { calendarEventId: (0, typeorm_1.In)(pageIds) },
                            select: { calendarEventId: true },
                        });
                        const referencedEventIds = new Set(associations.map(({ calendarEventId }) => calendarEventId));
                        const orphanEventIds = pageIds.filter((eventId) => !referencedEventIds.has(eventId));
                        if (orphanEventIds.length > 0) {
                            await calendarEventRepository.delete(orphanEventIds);
                        }
                    }
                });
            }, authContext, { lite: true });
        }
    };
    return CalendarEventCleanerService = _classThis;
})();
exports.CalendarEventCleanerService = CalendarEventCleanerService;
