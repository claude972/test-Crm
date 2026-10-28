import { KovaaLabCRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { InboundEmailParserService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service';
import { InboundEmailStorageService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-storage.service';
import { type InboundEmailMessageSourceInterface } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source.interface';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare class SesS3InboundEmailMessageSourceService implements InboundEmailMessageSourceInterface {
    private readonly kovaaLabConfigService;
    private readonly inboundEmailStorageService;
    private readonly inboundEmailParserService;
    constructor(kovaaLabConfigService: KovaaLabCRMConfigService, inboundEmailStorageService: InboundEmailStorageService, inboundEmailParserService: InboundEmailParserService);
    isConfigured(): boolean;
    fetchMessage(reference: string): Promise<MessageWithParticipants>;
    cleanup(reference: string): Promise<void>;
}
