import { type MessageOutboundDriver } from 'src/modules/messaging/message-outbound-manager/interfaces/message-outbound-driver.interface';
import { MicrosoftOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
export declare class MicrosoftMessageOutboundService implements MessageOutboundDriver {
    private readonly microsoftOAuth2ClientProvider;
    private readonly logger;
    constructor(microsoftOAuth2ClientProvider: MicrosoftOAuth2ClientProvider);
    sendMessage(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    createDraft(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<void>;
    sendDraft(draftExternalId: string, sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    private createDraftMessage;
    private createNewDraftMessage;
    private createReplyDraftMessage;
    private postAttachmentsToMessageCollection;
    private findMessageByInternetMessageId;
    private composeMicrosoftMessage;
}
