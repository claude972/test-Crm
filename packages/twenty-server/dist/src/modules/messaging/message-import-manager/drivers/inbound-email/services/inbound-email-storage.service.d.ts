import { InboundEmailS3ClientProvider } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/providers/inbound-email-s3-client.provider';
export declare class InboundEmailStorageService {
    private readonly inboundEmailS3ClientProvider;
    constructor(inboundEmailS3ClientProvider: InboundEmailS3ClientProvider);
    getRawMessage(s3Key: string): Promise<Buffer>;
    deleteRawMessage(s3Key: string): Promise<void>;
}
