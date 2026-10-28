import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { GmailGetMessagesService } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-messages.service';
import { ImapGetMessagesService } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-get-messages.service';
import { MicrosoftGetMessagesService } from 'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-messages.service';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export type GetMessagesResponse = MessageWithParticipants[];
export declare class MessagingGetMessagesService {
    private readonly gmailGetMessagesService;
    private readonly microsoftGetMessagesService;
    private readonly imapGetMessagesService;
    constructor(gmailGetMessagesService: GmailGetMessagesService, microsoftGetMessagesService: MicrosoftGetMessagesService, imapGetMessagesService: ImapGetMessagesService);
    getMessages(messageIds: string[], connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'accessToken' | 'refreshToken' | 'id' | 'handle' | 'handleAliases' | 'userWorkspaceId' | 'connectionParameters' | 'workspaceId'>, messageChannel: Pick<MessageChannelEntity, 'messageFolders' | 'messageFolderImportPolicy'>): Promise<GetMessagesResponse>;
}
