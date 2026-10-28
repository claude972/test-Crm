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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MessagingMessageCleanerService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageCleanerService = void 0;
const common_1 = require("@nestjs/common");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const participant_target_reconciliation_service_1 = require("src/modules/match-participant/participant-target-reconciliation.service");
const ORPHAN_CLEANUP_PAGE_SIZE = 500;
let MessagingMessageCleanerService = MessagingMessageCleanerService_1 = class MessagingMessageCleanerService {
    workspaceOrmManager;
    participantTargetReconciliationService;
    logger = new common_1.Logger(MessagingMessageCleanerService_1.name);
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
exports.MessagingMessageCleanerService = MessagingMessageCleanerService;
exports.MessagingMessageCleanerService = MessagingMessageCleanerService = MessagingMessageCleanerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof participant_target_reconciliation_service_1.ParticipantTargetReconciliationService !== "undefined" && participant_target_reconciliation_service_1.ParticipantTargetReconciliationService) === "function" ? _b : Object])
], MessagingMessageCleanerService);
