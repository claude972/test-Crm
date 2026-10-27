import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '@kovaa-lab/messaging';
import { ConversationChannelEntity } from './conversation-channel.entity';
import { ConversationService } from './conversation.service';
import { ConversationResolver } from './conversation.resolver';

@Module({
  imports: [
    MessagingModule,
    TypeOrmModule.forFeature([ConversationChannelEntity]),
  ],
  providers: [ConversationService, ConversationResolver],
  exports: [ConversationService],
})
export class MessagingModule {}