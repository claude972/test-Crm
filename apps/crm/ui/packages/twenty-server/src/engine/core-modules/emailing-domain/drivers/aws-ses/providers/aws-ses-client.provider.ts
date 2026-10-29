import { Injectable } from '@nestjs/common';

import {
  SESv2Client as SESClient,
  type SESv2ClientConfig as SESClientConfig,
} from '@aws-sdk/client-sesv2';

import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { buildAwsRequestHandlerOptions } from 'src/utils/aws-request-handler.util';

@Injectable()
export class AwsSesClientProvider {
  private sesClient: SESClient | null = null;

  constructor(private readonly kovaaLabConfigService: KovaaLabCRMConfigService) {}

  public getSESClient(): SESClient {
    if (!this.sesClient) {
      const config: SESClientConfig = {
        region: this.kovaaLabConfigService.get('AWS_SES_REGION'),
        requestHandler: buildAwsRequestHandlerOptions(),
      };

      const accessKeyId = this.kovaaLabConfigService.get('AWS_SES_ACCESS_KEY_ID');
      const secretAccessKey = this.kovaaLabConfigService.get(
        'AWS_SES_SECRET_ACCESS_KEY',
      );
      const sessionToken = this.kovaaLabConfigService.get(
        'AWS_SES_SESSION_TOKEN',
      );

      if (accessKeyId && secretAccessKey) {
        config.credentials = {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken ? { sessionToken } : {}),
        };
      }

      this.sesClient = new SESClient(config);
    }

    return this.sesClient;
  }
}
