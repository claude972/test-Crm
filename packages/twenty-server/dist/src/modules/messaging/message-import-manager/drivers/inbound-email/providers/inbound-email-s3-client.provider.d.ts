import { S3Client } from '@aws-sdk/client-s3';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
export declare class InboundEmailS3ClientProvider {
    private readonly kovaaLabConfigService;
    private s3Client;
    constructor(kovaaLabConfigService: KovaaLabCRMConfigService);
    getBucket(): string;
    getClient(): S3Client;
}
