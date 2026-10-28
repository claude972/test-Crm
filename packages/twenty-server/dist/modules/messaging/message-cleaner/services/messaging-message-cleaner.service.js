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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageCleanerService = void 0;
const common_1 = require("@nestjs/common");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const ORPHAN_CLEANUP_PAGE_SIZE = 500;
let MessagingMessageCleanerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageCleanerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageCleanerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        participantTargetReconciliationService;
        logger = new common_1.Logger(MessagingMessageCleanerService.name);
        constructor(workspaceOrmManager, participantTargetReconciliationService) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.participantTargetReconciliationService = participantTargetReconciliationService;
        }
        async deleteMessagesChannelMessageAssociationsAndRelatedOrphans({ workspaceId, messageExternalIds, messageChannelId, }) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const messageRepository = transactionScope.getRepository('message', { shouldBypassPermissionChecks: true });
                    const messageChannelMessageAssociationRepository = transactionScope.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                    const messageThreadRepository = transactionScope.getRepository('messageThread', { shouldBypassPermissionChecks: true });
                    for (const messageExternalIdsChunk of (0, lodash_chunk_1.default)(messageExternalIds, 500)) {
                        const associationsToDelete = await messageChannelMessageAssociationRepository.find({
                            where: {
                                messageExternalId: (0, typeorm_1.In)(messageExternalIdsChunk),
                                messageChannelId,
                            },
                        });
                        if (associationsToDelete.length <= 0) {
                            continue;
                        }
                        await messageChannelMessageAssociationRepository.delete(associationsToDelete.map(({ id }) => id));
                        this.logger.log(`WorkspaceId: ${workspaceId} Deleting ${associationsToDelete.length} message channel message associations`);
                        const candidateMessageIds = [
                            ...new Set(associationsToDelete.map(({ messageId }) => messageId)),
                        ];
                        const orphanMessageIds = await this.filterOrphans(candidateMessageIds, (messageIds) => this.findReferencedMessageIds(messageChannelMessageAssociationRepository, messageIds));
                        if (orphanMessageIds.length <= 0) {
                            continue;
                        }
                        const orphanMessages = await messageRepository.find({
                            where: { id: (0, typeorm_1.In)(orphanMessageIds) },
                        });
                        await messageRepository.delete(orphanMessageIds);
                        const candidateThreadIds = [
                            ...new Set(orphanMessages
                                .map(({ messageThreadId }) => messageThreadId)
                                .filter(utils_1.isDefined)),
                        ];
                        const orphanThreadIds = await this.filterOrphans(candidateThreadIds, (threadIds) => this.findReferencedThreadIds(messageRepository, threadIds));
                        if (orphanThreadIds.length > 0) {
                            await messageThreadRepository.delete(orphanThreadIds);
                        }
                        await this.participantTargetReconciliationService.reconcileMessageThreadTargets({
                            messageThreadIds: candidateThreadIds.filter((threadId) => !orphanThreadIds.includes(threadId)),
                            transactionScope,
                        });
                    }
                });
            }, authContext, { lite: true });
        }
        async deleteMessageChannelMessageAssociationsByChannelId({ workspaceId, messageChannelId, }) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const messageChannelMessageAssociationRepository = transactionScope.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                    for (;;) {
                        const associations = await messageChannelMessageAssociationRepository.find({
                            where: { messageChannelId },
                            take: ORPHAN_CLEANUP_PAGE_SIZE,
                            select: { id: true },
                        });
                        if (associations.length === 0) {
                            break;
                        }
                        const ids = associations.map(({ id }) => id);
                        this.logger.log(`WorkspaceId: ${workspaceId} Deleting ${ids.length} message channel message associations for channel ${messageChannelId}`);
                        await messageChannelMessageAssociationRepository.delete(ids);
                    }
                });
            }, authContext, { lite: true });
        }
        async cleanOrphanMessagesAndThreads(workspaceId) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                await this.workspaceOrmManager.runInWorkspaceTransaction(async (transactionScope) => {
                    const messageThreadRepository = transactionScope.getRepository('messageThread', { shouldBypassPermissionChecks: true });
                    const messageRepository = transactionScope.getRepository('message', { shouldBypassPermissionChecks: true });
                    const messageChannelMessageAssociationRepository = transactionScope.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                    await this.deleteOrphansByKeyset(async (cursor) => {
                        const page = await messageRepository.find({
                            where: (0, utils_1.isDefined)(cursor) ? { id: (0, typeorm_1.MoreThan)(cursor) } : {},
                            order: { id: 'ASC' },
                            take: ORPHAN_CLEANUP_PAGE_SIZE,
                            select: { id: true },
                        });
                        return page.map(({ id }) => id);
                    }, async (ids) => {
                        const messagesToDelete = await messageRepository.find({
                            where: { id: (0, typeorm_1.In)(ids) },
                            select: { messageThreadId: true },
                        });
                        const candidateThreadIds = [
                            ...new Set(messagesToDelete
                                .map(({ messageThreadId }) => messageThreadId)
                                .filter(utils_1.isDefined)),
                        ];
                        await messageRepository.delete(ids);
                        const survivingThreadIds = await this.findReferencedThreadIds(messageRepository, candidateThreadIds);
                        await this.participantTargetReconciliationService.reconcileMessageThreadTargets({
                            messageThreadIds: survivingThreadIds,
                            transactionScope,
                        });
                    }, (pageIds) => this.filterOrphans(pageIds, (ids) => this.findReferencedMessageIds(messageChannelMessageAssociationRepository, ids)));
                    await this.deleteOrphansByKeyset(async (cursor) => {
                        const page = await messageThreadRepository.find({
                            where: (0, utils_1.isDefined)(cursor) ? { id: (0, typeorm_1.MoreThan)(cursor) } : {},
                            order: { id: 'ASC' },
                            take: ORPHAN_CLEANUP_PAGE_SIZE,
                            select: { id: true },
                        });
                        return page.map(({ id }) => id);
                    }, (ids) => messageThreadRepository.delete(ids), (pageIds) => this.filterOrphans(pageIds, (ids) => this.findReferencedThreadIds(messageRepository, ids)));
                });
            }, authContext, { lite: true });
        }
        async findReferencedMessageIds(messageChannelMessageAssociationRepository, messageIds) {
            const associations = await messageChannelMessageAssociationRepository.find({
                where: { messageId: (0, typeorm_1.In)(messageIds) },
                select: { messageId: true },
            });
            return associations.map(({ messageId }) => messageId);
        }
        async findReferencedThreadIds(messageRepository, threadIds) {
            if (threadIds.length === 0) {
                return [];
            }
            const messages = await messageRepository.find({
                where: { messageThreadId: (0, typeorm_1.In)(threadIds) },
                select: { messageThreadId: true },
            });
            return messages
                .map(({ messageThreadId }) => messageThreadId)
                .filter(utils_1.isDefined);
        }
        async filterOrphans(parentIds, findReferencedParentIds) {
            if (parentIds.length === 0) {
                return [];
            }
            const referencedParentIds = new Set(await findReferencedParentIds(parentIds));
            return parentIds.filter((parentId) => !referencedParentIds.has(parentId));
        }
        async deleteOrphansByKeyset(fetchPageIds, deleteByIds, findOrphanIds) {
            let cursor;
            for (;;) {
                const pageIds = await fetchPageIds(cursor);
                if (pageIds.length === 0) {
                    break;
                }
                cursor = pageIds[pageIds.length - 1];
                const orphanIds = await findOrphanIds(pageIds);
                if (orphanIds.length > 0) {
                    await deleteByIds(orphanIds);
                }
            }
        }
    };
    return MessagingMessageCleanerService = _classThis;
})();
exports.MessagingMessageCleanerService = MessagingMessageCleanerService;
