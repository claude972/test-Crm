import { HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import { Module, type OnModuleInit } from '@nestjs/common';

import { EvolutionMessagesAdapter } from 'src/engine/core-modules/hermes-connectors/evolution/messages/evolution-messages.adapter';
import { EvolutionWebhookReceiver } from 'src/engine/core-modules/hermes-connectors/evolution/messages/evolution-webhook.receiver';
import {
  EvolutionWebhookController,
  EVOLUTION_WEBHOOK_RECEIVER,
} from 'src/engine/core-modules/hermes-connectors/evolution/messages/evolution-webhook.controller';
import { HermesMessagingModule } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.module';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesMcpBotAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Module({
  imports: [HermesMessagingModule],
  controllers: [EvolutionWebhookController],
  providers: [
    {
      provide: HermesMcpBotAdapter,
      inject: [KovaaLabCRMConfigService],
      useFactory: (config: KovaaLabCRMConfigService) =>
        new HermesMcpBotAdapter(config.get('HERMES_MCP_CONNECTIONS')),
    },
    {
      provide: EvolutionMessagesAdapter,
      inject: [KovaaLabCRMConfigService],
      useFactory: (config: KovaaLabCRMConfigService) =>
        new EvolutionMessagesAdapter(
          config.get('HERMES_EVOLUTION_CONNECTIONS'),
        ),
    },
    {
      provide: EVOLUTION_WEBHOOK_RECEIVER,
      inject: [
        KovaaLabCRMConfigService,
        HermesMessagingService,
        HermesMediaService,
        EvolutionMessagesAdapter,
      ],
      useFactory: (
        config: KovaaLabCRMConfigService,
        inbox: HermesMessagingService,
        media: HermesMediaService,
        evolution: EvolutionMessagesAdapter,
      ) =>
        new EvolutionWebhookReceiver(
          config.get('HERMES_EVOLUTION_CONNECTIONS'),
          config.get('HERMES_EVOLUTION_WEBHOOK_SECRETS'),
          (event) => inbox.ingest(event),
          async (input) => {
            const content = await evolution.receiveMedia(input);
            return media.receive({ ...input, ...content });
          },
        ),
    },
  ],
})
export class HermesMessagingConnectorsModule implements OnModuleInit {
  constructor(
    private readonly registry: HermesMessagingAdapterRegistry,
    private readonly evolution: EvolutionMessagesAdapter,
    private readonly bot: HermesMcpBotAdapter,
  ) {}
  onModuleInit() {
    this.registry.register(this.evolution);
    this.registry.registerBot(this.bot);
  }
}
