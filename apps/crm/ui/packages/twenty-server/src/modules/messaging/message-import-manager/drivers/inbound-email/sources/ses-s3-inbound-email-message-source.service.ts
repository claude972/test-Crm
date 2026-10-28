import { Injectable } from '@nestjs/common';

import { StorageDriverType } from 'src/engine/core-modules/file-storage/interfaces/file-storage.interface';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { InboundEmailParserService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service';
import { InboundEmailStorageService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-storage.service';
import { type InboundEmailMessageSourceInterface } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source.interface';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';

// SES receipt rules park the raw MIME in S3; the reference is the S3 object key
@Injectable()
export class SesS3InboundEmailMessageSourceService implements InboundEmailMessageSourceInterface {
  constructor(
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly inboundEmailStorageService: InboundEmailStorageService,
    private readonly inboundEmailParserService: InboundEmailParserService,
  ) {}

  isConfigured(): boolean {
    return (
      this.kovaa-labConfigService.get('STORAGE_TYPE') === StorageDriverType.S_3
    );
  }

  async fetchMessage(reference: string): Promise<MessageWithParticipants> {
    const rawMessage =
      await this.inboundEmailStorageService.getRawMessage(reference);

    const { message } = await this.inboundEmailParserService.parse(
      rawMessage,
      reference,
    );

    return message;
  }

  async cleanup(reference: string): Promise<void> {
    await this.inboundEmailStorageService.deleteRawMessage(reference);
  }
}
