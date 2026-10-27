import { Injectable } from '@nestjs/common';
import { ConversationChannelEntity } from './common/standard-objects/conversation-channel.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationChannelEntity)
    private conversationChannelRepository: Repository<ConversationChannelEntity>,
  ) {}

  async getConversations(): Promise<ConversationChannelEntity[]> {
    return this.conversationChannelRepository.find();
  }

  async sendOnChannel(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', message: string): Promise<void> {
    const channel = await this.conversationChannelRepository.findOne({ where: { messageThreadId, channelType } });
    if (channel) {
      // Logic to send message on the channel
    }
  }

  async updateStatus(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', status: 'OPEN' | 'ON_HOLD' | 'CLOSED'): Promise<void> {
    await this.conversationChannelRepository.update({ messageThreadId, channelType }, { status });
  }

  async toggleBot(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', isBotEnabled: boolean): Promise<void> {
    await this.conversationChannelRepository.update({ messageThreadId, channelType }, { isBotEnabled });
  }

  async setAutoResponseRules(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', autoResponseRules: string): Promise<void> {
    await this.conversationChannelRepository.update({ messageThreadId, channelType }, { autoResponseRules });
  }
}