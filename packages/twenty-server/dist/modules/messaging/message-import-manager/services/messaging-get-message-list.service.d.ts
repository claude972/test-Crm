import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { type MessageFolder } from 'src/modules/messaging/message-folder-manager/interfaces/message-folder-driver.interface';
import { GmailGetMessageListService } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-message-list.service';
import { ImapGetMessageListService } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-get-message-list.service';
import { MicrosoftGetMessageListService } from 'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-message-list.service';
import { type GetMessageListsResponse } from 'src/modules/messaging/message-import-manager/types/get-message-lists-response.type';
export declare class MessagingGetMessageListService {
    private readonly gmailGetMessageListService;
    private readonly microsoftGetMessageListService;
    private readonly imapGetMessageListService;
    constructor(gmailGetMessageListService: GmailGetMessageListService, microsoftGetMessageListService: MicrosoftGetMessageListService, imapGetMessageListService: ImapGetMessageListService);
    getMessageLists(messageChannel: MessageChannelEntity, messageFolders: MessageFolder[]): Promise<GetMessageListsResponse>;
}
