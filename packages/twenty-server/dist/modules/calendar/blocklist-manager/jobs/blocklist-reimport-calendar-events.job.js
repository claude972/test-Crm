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
exports.BlocklistReimportCalendarEventsJob = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const group_blocklist_handles_by_owner_util_1 = require("src/modules/blocklist/utils/group-blocklist-handles-by-owner.util");
let BlocklistReimportCalendarEventsJob = (() => {
    let _classDecorators = [(0, processor_decorator_1.Processor)({
            queueName: message_queue_constants_1.MessageQueue.calendarQueue,
            scope: common_1.Scope.REQUEST,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handle_decorators;
    var BlocklistReimportCalendarEventsJob = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _handle_decorators = [(0, process_decorator_1.Process)(BlocklistReimportCalendarEventsJob.name)];
            __esDecorate(this, null, _handle_decorators, { kind: "method", name: "handle", static: false, private: false, access: { has: obj => "handle" in obj, get: obj => obj.handle }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BlocklistReimportCalendarEventsJob = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager = __runInitializers(this, _instanceExtraInitializers);
        calendarChannelRepository;
        userWorkspaceRepository;
        calendarChannelSyncStatusService;
        constructor(workspaceOrmManager, calendarChannelRepository, userWorkspaceRepository, calendarChannelSyncStatusService) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.calendarChannelRepository = calendarChannelRepository;
            this.userWorkspaceRepository = userWorkspaceRepository;
            this.calendarChannelSyncStatusService = calendarChannelSyncStatusService;
        }
        async handle(data) {
            const workspaceId = data.workspaceId;
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const { workspaceScopedHandles, handlesByWorkspaceMemberId } = (0, group_blocklist_handles_by_owner_util_1.groupBlocklistHandlesByOwner)(data.events.map((eventPayload) => eventPayload.properties.before));
                const calendarChannelIdsToReset = new Set();
                if (workspaceScopedHandles.length > 0) {
                    for (const calendarChannelId of await this.findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId: null })) {
                        calendarChannelIdsToReset.add(calendarChannelId);
                    }
                }
                for (const workspaceMemberId of handlesByWorkspaceMemberId.keys()) {
                    const userWorkspaceId = await this.findWorkspaceMemberUserWorkspaceId({
                        workspaceMemberId,
                        workspaceId,
                    });
                    if (!(0, utils_1.isDefined)(userWorkspaceId)) {
                        continue;
                    }
                    for (const calendarChannelId of await this.findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId })) {
                        calendarChannelIdsToReset.add(calendarChannelId);
                    }
                }
                if (calendarChannelIdsToReset.size === 0) {
                    return;
                }
                await this.calendarChannelSyncStatusService.resetAndMarkAsCalendarEventListFetchPending([...calendarChannelIdsToReset], workspaceId);
            }, authContext, { lite: true });
        }
        async findWorkspaceMemberUserWorkspaceId({ workspaceMemberId, workspaceId, }) {
            const workspaceMemberRepository = this.workspaceOrmManager.getRepository('workspaceMember', { shouldBypassPermissionChecks: true });
            const workspaceMember = await workspaceMemberRepository.findOne({
                where: { id: workspaceMemberId },
            });
            if (!(0, utils_1.isDefined)(workspaceMember)) {
                return null;
            }
            const userWorkspace = await this.userWorkspaceRepository.findOne({
                where: { userId: workspaceMember.userId, workspaceId },
                select: ['id'],
            });
            return userWorkspace?.id ?? null;
        }
        async findCalendarChannelIdsToReset({ workspaceId, userWorkspaceId, }) {
            const where = {
                syncStage: (0, typeorm_1.Not)(types_1.CalendarChannelSyncStage.CALENDAR_EVENT_LIST_FETCH_PENDING),
                workspaceId,
            };
            if ((0, utils_1.isDefined)(userWorkspaceId)) {
                where.connectedAccount = { userWorkspaceId };
            }
            const calendarChannels = await this.calendarChannelRepository.find({
                select: ['id'],
                where,
            });
            return calendarChannels.map((calendarChannel) => calendarChannel.id);
        }
    };
    return BlocklistReimportCalendarEventsJob = _classThis;
})();
exports.BlocklistReimportCalendarEventsJob = BlocklistReimportCalendarEventsJob;
