import { ResendApiClientService } from 'src/engine/core-modules/emailing-domain/drivers/resend/services/resend-api-client.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { InboundEmailParserService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service';
import { type InboundEmailMessageSourceInterface } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source.interface';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare class ResendInboundEmailMessageSourceService implements InboundEmailMessageSourceInterface {
    private readonly kovaaLabConfigService;
    private readonly resendApiClientService;
    private readonly inboundEmailParserService;
    constructor(kovaaLabConfigService: KovaaLabCRMConfigService, resendApiClientService: ResendApiClientService, inboundEmailParserService: InboundEmailParserService);
    isConfigured(): boolean;
    fetchMessage(reference: string): Promise<MessageWithParticipants>;
    cleanup(_reference: string): Promise<void>;
}
