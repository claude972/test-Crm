import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { GoogleOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { GmailMessagesImportErrorHandler } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-messages-import-error-handler.service';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare class GmailGetMessagesService {
    private readonly googleOAuth2ClientProvider;
    private readonly gmailMessagesImportErrorHandler;
    constructor(googleOAuth2ClientProvider: GoogleOAuth2ClientProvider, gmailMessagesImportErrorHandler: GmailMessagesImportErrorHandler);
    getMessages(messageIds: string[], connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'id' | 'handle' | 'handleAliases'>, messageChannel: Pick<MessageChannelEntity, 'messageFolders' | 'messageFolderImportPolicy'>): Promise<MessageWithParticipants[]>;
    private fetchMessages;
}
