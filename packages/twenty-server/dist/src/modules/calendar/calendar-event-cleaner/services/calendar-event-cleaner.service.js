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
var CalendarEventCleanerService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventCleanerService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const CALENDAR_CLEANUP_PAGE_SIZE = 500;
let CalendarEventCleanerService = CalendarEventCleanerService_1 = class CalendarEventCleanerService {
    workspaceOrmManager;
    logger = new common_1.Logger(CalendarEventCleanerService_1.name);
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
exports.CalendarEventCleanerService = CalendarEventCleanerService;
exports.CalendarEventCleanerService = CalendarEventCleanerService = CalendarEventCleanerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object])
], CalendarEventCleanerService);
