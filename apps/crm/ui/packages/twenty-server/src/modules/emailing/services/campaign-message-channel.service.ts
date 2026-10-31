import { Injectable } from '@nestjs/common';

import { MessageChannelType } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { EmailingDomainMailboxTransportProvider } from 'src/engine/core-modules/emailing-domain/drivers/smtp/providers/emailing-domain-mailbox-transport.provider';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type MessageChannelDTO } from 'src/engine/metadata-modules/message-channel/dtos/message-channel.dto';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { MessageChannelMetadataService } from 'src/engine/metadata-modules/message-channel/message-channel-metadata.service';

@Injectable()
export class CampaignMessageChannelService {
  constructor(
    private readonly kovaaLabConfigService: KovaaLabCRMConfigService,
    private readonly mailboxTransportProvider: EmailingDomainMailboxTransportProvider,
    private readonly messageChannelMetadataService: MessageChannelMetadataService,
  ) {}

  async resolve({
    fromAddress,
    userWorkspaceId,
    workspaceId,
  }: {
    fromAddress: string;
    userWorkspaceId: string;
    workspaceId: string;
  }): Promise<MessageChannelDTO> {
    if (
      this.kovaaLabConfigService.get('EMAILING_DOMAIN_DRIVER') !==
        EmailingDomainDriver.SMTP ||
      !this.mailboxTransportProvider.isConnectionCentreInstalled
    ) {
      return this.messageChannelMetadataService.getOrCreateEmailGroupChannel({
        fromAddress,
        userWorkspaceId,
        workspaceId,
      });
    }

    // A registered mailbox already has its own inbound channel. Creating an
    // EMAIL_GROUP instead would incorrectly require an AWS/Resend forwarder.
    const mailbox = await this.mailboxTransportProvider.authorize(
      workspaceId,
      fromAddress,
    );
    const channels =
      await this.messageChannelMetadataService.findByConnectedAccountIdForUser({
        connectedAccountId: mailbox.connectedAccountId,
        userWorkspaceId,
        workspaceId,
      });
    const channel = channels.find(
      (candidate) => candidate.type === MessageChannelType.EMAIL,
    );

    if (!isDefined(channel)) {
      throw new MessageChannelException(
        'The registered SMTP mailbox has no native email channel',
        MessageChannelExceptionCode.MESSAGE_CHANNEL_NOT_FOUND,
      );
    }

    return channel;
  }
}
