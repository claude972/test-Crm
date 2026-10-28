import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/kovaa-lab-orm/types/workspace-transaction-scope.type';
import { type MessageWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message.workspace-entity';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare class MessagingMessageService {
    private readonly workspaceOrmManager;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager);
    saveMessagesWithinTransaction(messages: MessageWithParticipants[], messageChannelId: string, transactionScope: WorkspaceTransactionScope, workspaceId: string): Promise<{
        createdMessages: Partial<MessageWorkspaceEntity>[];
        messageExternalIdsAndIdsMap: Map<string, string>;
        messageExternalIdToMessageChannelMessageAssociationIdMap: Map<string, string>;
        messageExternalIdToMessageThreadIdMap: Map<string, string>;
    }>;
    private enrichMessageAccumulatorWithExistingMessages;
    private enrichMessageAccumulatorWithExistingMessageThreadIds;
    private enrichMessageAccumulatorWithExistingMessageChannelMessageAssociations;
    private enrichMessageAccumulatorWithMessageThreadToCreate;
}
