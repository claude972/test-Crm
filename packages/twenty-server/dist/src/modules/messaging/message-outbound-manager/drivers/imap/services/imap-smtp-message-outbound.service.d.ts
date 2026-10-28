import { Repository } from 'typeorm';
import { type MessageOutboundDriver } from 'src/modules/messaging/message-outbound-manager/interfaces/message-outbound-driver.interface';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';
import { ImapFindDraftsFolderService } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-find-drafts-folder.service';
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class ImapSmtpMessageOutboundService implements MessageOutboundDriver {
    private readonly smtpClientProvider;
    private readonly imapClientProvider;
    private readonly imapFindDraftsFolderService;
    private readonly messageChannelRepository;
    private readonly messageFolderRepository;
    private readonly logger;
    constructor(smtpClientProvider: SmtpClientProvider, imapClientProvider: ImapClientProvider, imapFindDraftsFolderService: ImapFindDraftsFolderService, messageChannelRepository: Repository<MessageChannelEntity>, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>);
    sendMessage(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    createDraft(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<void>;
    sendDraft(draftExternalId: string, sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    deleteDraft(externalId: string, connectedAccount: ConnectedAccountEntity): Promise<void>;
    private compileRawMessage;
    private assertHandleIsDefined;
}
