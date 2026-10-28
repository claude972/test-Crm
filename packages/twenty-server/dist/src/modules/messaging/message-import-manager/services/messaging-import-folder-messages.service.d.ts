import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { type MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { GmailGetMessageListService } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-message-list.service';
export declare class MessagingImportFolderMessagesService {
    private readonly gmailGetMessageListService;
    constructor(gmailGetMessageListService: GmailGetMessageListService);
    getFolderMessageIdsToImport(messageChannel: MessageChannelEntity, messageFolder: MessageFolderEntity): Promise<string[]>;
}
