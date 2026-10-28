import { Repository } from 'typeorm';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';
import { MessagingMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
export declare class MessagingDraftSendService {
    private readonly workspaceOrmManager;
    private readonly messageOutboundService;
    private readonly messageCleanerService;
    private readonly messageChannelRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageOutboundService: MessagingMessageOutboundService, messageCleanerService: MessagingMessageCleanerService, messageChannelRepository: Repository<MessageChannelEntity>);
    sendDraftMessage({ draftMessageId, sendMessageInput, connectedAccount, workspaceId, }: {
        draftMessageId: string;
        sendMessageInput: SendMessageInput;
        connectedAccount: ConnectedAccountEntity;
        workspaceId: string;
    }): Promise<SendMessageResult>;
    getSentMessageThreadId({ messageExternalId, workspaceId, }: {
        messageExternalId: string;
        workspaceId: string;
    }): Promise<string | undefined>;
    deleteSentDraft({ draftMessageId, connectedAccountId, workspaceId, }: {
        draftMessageId: string;
        connectedAccountId: string;
        workspaceId: string;
    }): Promise<void>;
    private resolveDraftAssociation;
}
