import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { ParticipantTargetReconciliationService } from 'src/modules/match-participant/participant-target-reconciliation.service';
export declare class MessagingMessageCleanerService {
    private readonly workspaceOrmManager;
    private readonly participantTargetReconciliationService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, participantTargetReconciliationService: ParticipantTargetReconciliationService);
    deleteMessagesChannelMessageAssociationsAndRelatedOrphans({ workspaceId, messageExternalIds, messageChannelId, }: {
        workspaceId: string;
        messageExternalIds: string[];
        messageChannelId: string;
    }): Promise<void>;
    deleteMessageChannelMessageAssociationsByChannelId({ workspaceId, messageChannelId, }: {
        workspaceId: string;
        messageChannelId: string;
    }): Promise<void>;
    cleanOrphanMessagesAndThreads(workspaceId: string): Promise<void>;
    private findReferencedMessageIds;
    private findReferencedThreadIds;
    private filterOrphans;
    private deleteOrphansByKeyset;
}
