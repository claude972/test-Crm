import { type MessageOutboundDriver } from 'src/modules/messaging/message-outbound-manager/interfaces/message-outbound-driver.interface';
import { GoogleOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
export declare class GmailMessageOutboundService implements MessageOutboundDriver {
    private readonly googleOAuth2ClientProvider;
    private readonly logger;
    constructor(googleOAuth2ClientProvider: GoogleOAuth2ClientProvider);
    sendMessage(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    private getGmailAssignedHeaderMessageId;
    createDraft(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<void>;
    sendDraft(draftExternalId: string, sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    private deleteDraftByMessageId;
    private findDraftIdByMessageId;
    private composeGmailMessage;
    private getFromName;
}
