import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { EmailGroupMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/drivers/email-group/services/email-group-message-outbound.service';
import { GmailMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/drivers/gmail/services/gmail-message-outbound.service';
import { ImapSmtpMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/drivers/imap/services/imap-smtp-message-outbound.service';
import { MicrosoftMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/drivers/microsoft/services/microsoft-message-outbound.service';
import { SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
export declare class MessagingMessageOutboundService {
    private readonly gmailMessageOutboundService;
    private readonly microsoftMessageOutboundService;
    private readonly imapSmtpMessageOutboundService;
    private readonly emailGroupMessageOutboundService;
    constructor(gmailMessageOutboundService: GmailMessageOutboundService, microsoftMessageOutboundService: MicrosoftMessageOutboundService, imapSmtpMessageOutboundService: ImapSmtpMessageOutboundService, emailGroupMessageOutboundService: EmailGroupMessageOutboundService);
    sendMessage(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    createDraft(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<void>;
    sendDraft(draftExternalId: string, sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
}
