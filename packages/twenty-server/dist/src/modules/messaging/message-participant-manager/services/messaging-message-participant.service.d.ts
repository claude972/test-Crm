import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/kovaa-lab-orm/types/workspace-transaction-scope.type';
import { type MatchParticipantsArgs, MatchParticipantService } from 'src/modules/match-participant/match-participant.service';
import { type MessageParticipantWorkspaceEntity } from 'src/modules/messaging/common/standard-objects/message-participant.workspace-entity';
import { type ParticipantWithMessageId } from 'src/modules/messaging/message-import-manager/drivers/gmail/types/gmail-message.type';
export declare class MessagingMessageParticipantService {
    private readonly workspaceOrmManager;
    private readonly matchParticipantService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, matchParticipantService: MatchParticipantService<MessageParticipantWorkspaceEntity>);
    saveMessageParticipants(participants: ParticipantWithMessageId[], workspaceId: string, transactionScope: WorkspaceTransactionScope): Promise<MessageParticipantWorkspaceEntity[]>;
    matchMessageParticipants({ participants, messageIds, workspaceId, matchWith, personHandleField, }: {
        participants: MessageParticipantWorkspaceEntity[];
        messageIds: string[];
        workspaceId: string;
        matchWith?: MatchParticipantsArgs<MessageParticipantWorkspaceEntity>['matchWith'];
        personHandleField?: MatchParticipantsArgs<MessageParticipantWorkspaceEntity>['personHandleField'];
    }): Promise<void>;
}
