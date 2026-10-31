import { Module, type OnModuleInit } from '@nestjs/common';

import { EvolutionMessagesAdapter } from 'src/engine/core-modules/hermes-connectors/evolution/messages/evolution-messages.adapter';
import {
  EvolutionWebhookController,
  EVOLUTION_WEBHOOK_RECEIVER,
} from 'src/engine/core-modules/hermes-connectors/evolution/messages/evolution-webhook.controller';
import { HermesMessagingModule } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.module';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMcpBotAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter';
import { HermesConnectedEvolutionAdapter } from './evolution/hermes-connected-evolution.adapter';
import { HermesConnectedEvolutionReceiver } from './evolution/hermes-connected-evolution.receiver';
import { HermesConnectedMcpAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-connected-mcp.adapter';

@Module({
  imports: [HermesMessagingModule],
  exports: [HermesConnectedMcpAdapter],
  controllers: [EvolutionWebhookController],
  providers: [
    HermesConnectedEvolutionAdapter,
    HermesConnectedEvolutionReceiver,
    HermesConnectedMcpAdapter,
    {
      provide: EvolutionMessagesAdapter,
      useExisting: HermesConnectedEvolutionAdapter,
    },
    { provide: HermesMcpBotAdapter, useExisting: HermesConnectedMcpAdapter },
    {
      provide: EVOLUTION_WEBHOOK_RECEIVER,
      useExisting: HermesConnectedEvolutionReceiver,
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
