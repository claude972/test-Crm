import { Repository } from 'typeorm';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessagingSaveMessagesAndEnqueueContactCreationService } from 'src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service';
import { type PersistSentMessageInput } from 'src/modules/messaging/message-outbound-manager/types/persist-sent-message-input.type';
import { type PersistedSentMessage } from 'src/modules/messaging/message-outbound-manager/types/persisted-sent-message.type';
export declare class SentMessagePersistenceService {
    private readonly messageChannelRepository;
    private readonly saveMessagesAndEnqueueContactCreationService;
    constructor(messageChannelRepository: Repository<MessageChannelEntity>, saveMessagesAndEnqueueContactCreationService: MessagingSaveMessagesAndEnqueueContactCreationService);
    persistSentMessage(input: PersistSentMessageInput): Promise<PersistedSentMessage | undefined>;
}
