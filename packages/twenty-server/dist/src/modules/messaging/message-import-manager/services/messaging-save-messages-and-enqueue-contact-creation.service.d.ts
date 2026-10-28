import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessagingMessageFolderAssociationService } from 'src/modules/messaging/message-import-manager/services/messaging-message-folder-association.service';
import { MessagingMessageService } from 'src/modules/messaging/message-import-manager/services/messaging-message.service';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
import { MessagingMessageParticipantService } from 'src/modules/messaging/message-participant-manager/services/messaging-message-participant.service';
import { type PersonHandleField } from 'src/modules/match-participant/person-handle-field/types/person-handle-field.type';
export declare class MessagingSaveMessagesAndEnqueueContactCreationService {
    private readonly messageQueueService;
    private readonly messageService;
    private readonly messageParticipantService;
    private readonly messageFolderAssociationService;
    private readonly workspaceOrmManager;
    constructor(messageQueueService: MessageQueueService, messageService: MessagingMessageService, messageParticipantService: MessagingMessageParticipantService, messageFolderAssociationService: MessagingMessageFolderAssociationService, workspaceOrmManager: WorkspaceOrmManager);
    saveMessagesAndEnqueueContactCreation({ messagesToSave, messageChannel, connectedAccount, workspaceId, personHandleField, }: {
        messagesToSave: MessageWithParticipants[];
        messageChannel: MessageChannelEntity;
        connectedAccount: ConnectedAccountEntity;
        workspaceId: string;
        personHandleField?: PersonHandleField;
    }): Promise<{
        messageExternalIdsAndIdsMap: Map<string, string>;
        messageExternalIdToMessageThreadIdMap: Map<string, string>;
    } | undefined>;
    private matchAppChannelParticipants;
    private findUnlinkedParticipants;
}
