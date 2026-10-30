import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  HERMES_MESSAGING_ADAPTERS,
  HERMES_MESSAGING_BOT_ADAPTER,
  type HermesMessagingBotAdapter,
  type HermesMessagingAdapter,
  type HermesMessagingChannel,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@Injectable()
export class HermesMessagingAdapterRegistry {
  private readonly adapters = new Map<
    HermesMessagingChannel,
    HermesMessagingAdapter
  >();
  private bot: HermesMessagingBotAdapter | undefined;
  constructor(
    @Optional()
    @Inject(HERMES_MESSAGING_ADAPTERS)
    adapters?: HermesMessagingAdapter[],
    @Optional()
    @Inject(HERMES_MESSAGING_BOT_ADAPTER)
    bot?: HermesMessagingBotAdapter,
  ) {
    for (const adapter of adapters ?? []) this.register(adapter);
    if (bot) this.registerBot(bot);
  }
  register(adapter: HermesMessagingAdapter): void {
    if (this.adapters.has(adapter.channel))
      throw new Error('MESSAGING_ADAPTER_ALREADY_REGISTERED');
    this.adapters.set(adapter.channel, adapter);
  }
  registerBot(adapter: HermesMessagingBotAdapter): void {
    if (this.bot) throw new Error('MESSAGING_BOT_ALREADY_REGISTERED');
    this.bot = adapter;
  }
  getBot(): HermesMessagingBotAdapter | undefined {
    return this.bot;
  }
  get(channel: HermesMessagingChannel): HermesMessagingAdapter | undefined {
    return this.adapters.get(channel);
  }
}
