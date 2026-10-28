import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/kovaa-lab-orm/types/workspace-transaction-scope.type';
import { type MessageChannelMessageAssociationFolderAssociation } from 'src/modules/messaging/message-import-manager/types/message-channel-message-association-folder-association.type';
export declare class MessagingMessageFolderAssociationService {
    private readonly workspaceOrmManager;
    constructor(workspaceOrmManager: WorkspaceOrmManager);
    saveMessageFolderAssociations(associations: MessageChannelMessageAssociationFolderAssociation[], workspaceId: string, transactionScope: WorkspaceTransactionScope): Promise<void>;
}
