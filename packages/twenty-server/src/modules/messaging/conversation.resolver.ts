import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ConversationService } from './conversation.service';
import { ConversationChannelEntity } from './common/standard-objects/conversation-channel.entity';

@Resolver(() => ConversationChannelEntity)
export class ConversationResolver {
  constructor(private readonly conversationService: ConversationService) {}

  @Query(() => [ConversationChannelEntity])
  async getConversations(): Promise<ConversationChannelEntity[]> {
    return this.conversationService.getConversations();
  }

  @Mutation(() => ConversationChannelEntity)
  async sendOnChannel(
    @Args('messageThreadId') messageThreadId: string,
    @Args('channelType') channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT',
    @Args('message') message: string,
  ): Promise<void> {
    return this.conversationService.sendOnChannel(messageThreadId, channelType, message);
  }

  @Mutation(() => ConversationChannelEntity)
  async updateStatus(
    @Args('messageThreadId') messageThreadId: string,
    @Args('channelType') channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT',
    @Args('status') status: 'OPEN' | 'ON_HOLD' | 'CLOSED',
  ): Promise<void> {
    return this.conversationService.updateStatus(messageThreadId, channelType, status);
  }

  @Mutation(() => ConversationChannelEntity)
  async toggleBot(
    @Args('messageThreadId') messageThreadId: string,
    @Args('channelType') channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT',
    @Args('isBotEnabled') isBotEnabled: boolean,
  ): Promise<void> {
    return this.conversationService.toggleBot(messageThreadId, channelType, isBotEnabled);
  }

  @Mutation(() => ConversationChannelEntity)
  async setAutoResponseRules(
    @Args('messageThreadId') messageThreadId: string,
    @Args('channelType') channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT',
    @Args('autoResponseRules') autoResponseRules: string,
  ): Promise<void> {
    return this.conversationService.setAutoResponseRules(messageThreadId, channelType, autoResponseRules);
  }
}