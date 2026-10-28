import { BillingService } from 'src/engine/core-modules/billing/services/billing.service';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { EmailingDomainEntity } from 'src/engine/core-modules/emailing-domain/emailing-domain.entity';
import { UsageLimitSpeedService } from 'src/engine/core-modules/usage-limit/services/usage-limit-speed.service';
import { EmailingDomainSenderService } from 'src/modules/emailing/services/emailing-domain-sender.service';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { type MessageOutboundDriver } from 'src/modules/messaging/message-outbound-manager/interfaces/message-outbound-driver.interface';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
import { type SendMessageResult } from 'src/modules/messaging/message-outbound-manager/types/send-message-result.type';
export declare class EmailGroupMessageOutboundService implements MessageOutboundDriver {
    private readonly emailingDomainRepository;
    private readonly emailingDomainSenderService;
    private readonly usageLimitSpeedService;
    private readonly billingService;
    private readonly cacheStorage;
    constructor(emailingDomainRepository: WorkspaceScopedRepository<EmailingDomainEntity>, emailingDomainSenderService: EmailingDomainSenderService, usageLimitSpeedService: UsageLimitSpeedService, billingService: BillingService, cacheStorage: CacheStorageService);
    sendMessage(sendMessageInput: SendMessageInput, connectedAccount: ConnectedAccountEntity): Promise<SendMessageResult>;
    createDraft(): Promise<void>;
    sendDraft(): Promise<SendMessageResult>;
    private resolveEmailingDomain;
    private buildDailyRecipientCountKey;
    private consumeDailyRecipientAllowanceOrThrow;
    private toRecipientArray;
}
