import { ConversationChannelEntity } from './common/standard-objects/conversation-channel.entity';
import { Repository } from 'typeorm';
export declare class ConversationService {
    private conversationChannelRepository;
    constructor(conversationChannelRepository: Repository<ConversationChannelEntity>);
    getConversations(): Promise<ConversationChannelEntity[]>;
    sendOnChannel(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', message: string): Promise<void>;
    updateStatus(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', status: 'OPEN' | 'ON_HOLD' | 'CLOSED'): Promise<void>;
    toggleBot(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', isBotEnabled: boolean): Promise<void>;
    setAutoResponseRules(messageThreadId: string, channelType: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT', autoResponseRules: string): Promise<void>;
}
