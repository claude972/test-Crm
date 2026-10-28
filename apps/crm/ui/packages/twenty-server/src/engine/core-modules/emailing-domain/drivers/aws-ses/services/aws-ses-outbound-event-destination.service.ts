import { Injectable, Logger } from '@nestjs/common';

import {
  AlreadyExistsException,
  CreateConfigurationSetEventDestinationCommand,
  type EventDestinationDefinition,
  UpdateConfigurationSetEventDestinationCommand,
} from '@aws-sdk/client-sesv2';
import { isNonEmptyString } from '@sniptt/guards';

import { AwsSesClientProvider } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/providers/aws-ses-client.provider';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

const EVENT_DESTINATION_NAME = 'kovaa-lab-outbound-sns';

@Injectable()
export class AwsSesOutboundEventDestinationService {
  private readonly logger = new Logger(
    AwsSesOutboundEventDestinationService.name,
  );

  constructor(
    private readonly awsSesClientProvider: AwsSesClientProvider,
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
  ) {}

  async upsertEventDestinationOrThrow(
    configurationSetName: string,
  ): Promise<void> {
    const topicArn = this.kovaa-labConfigService.get('SES_OUTBOUND_SNS_TOPIC_ARN');

    if (!isNonEmptyString(topicArn)) {
      this.logger.warn(
        'SES_OUTBOUND_SNS_TOPIC_ARN is not configured, so delivery, reject and rendering-failure events will not reach the outbound webhook. Bounces and complaints still arrive through the EventBridge subscription.',
      );

      return;
    }

    const eventDestination: EventDestinationDefinition = {
      Enabled: true,
      MatchingEventTypes: [
        'DELIVERY',
        'BOUNCE',
        'COMPLAINT',
        'REJECT',
        'RENDERING_FAILURE',
      ],
      SnsDestination: { TopicArn: topicArn },
    };

    const sesClient = this.awsSesClientProvider.getSESClient();

    await sesClient
      .send(
        new CreateConfigurationSetEventDestinationCommand({
          ConfigurationSetName: configurationSetName,
          EventDestinationName: EVENT_DESTINATION_NAME,
          EventDestination: eventDestination,
        }),
      )
      .catch(async (error) => {
        if (!(error instanceof AlreadyExistsException)) {
          throw error;
        }

        await sesClient.send(
          new UpdateConfigurationSetEventDestinationCommand({
            ConfigurationSetName: configurationSetName,
            EventDestinationName: EVENT_DESTINATION_NAME,
            EventDestination: eventDestination,
          }),
        );
      });
  }
}
