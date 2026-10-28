import { Repository } from 'typeorm';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { InboundEmailMessageSourceResolverService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source-resolver.service';
import { type InboundEmailImportOutcome } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/types/inbound-email-import-outcome.type';
import { type InboundEmailMessageReference } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/types/inbound-email-message-reference.type';
import { MessagingSaveMessagesAndEnqueueContactCreationService } from 'src/modules/messaging/message-import-manager/services/messaging-save-messages-and-enqueue-contact-creation.service';
type ImportInboundMessageParams = {
    messageReference: InboundEmailMessageReference;
    envelopeRecipients: string[];
};
export declare class InboundEmailImportService {
    private readonly kovaaLabConfigService;
    private readonly inboundEmailMessageSourceResolverService;
    private readonly workspaceOrmManager;
    private readonly messagingSaveMessagesAndEnqueueContactCreationService;
    private readonly messageChannelRepository;
    private readonly connectedAccountRepository;
    private readonly logger;
    constructor(kovaaLabConfigService: KovaaLabCRMConfigService, inboundEmailMessageSourceResolverService: InboundEmailMessageSourceResolverService, workspaceOrmManager: WorkspaceOrmManager, messagingSaveMessagesAndEnqueueContactCreationService: MessagingSaveMessagesAndEnqueueContactCreationService, messageChannelRepository: Repository<MessageChannelEntity>, connectedAccountRepository: Repository<ConnectedAccountEntity>);
    importInboundMessage(params: ImportInboundMessageParams): Promise<InboundEmailImportOutcome>;
    private findExistingThreadExternalId;
    private matchInboundRecipient;
}
export {};
