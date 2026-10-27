import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessagingBlocklistManagerModule } from 'src/modules/messaging/blocklist-manager/messaging-blocklist-manager.module';
import { MessagingMessageCleanerModule } from 'src/modules/messaging/message-cleaner/messaging-message-cleaner.module';
import { MessagingImportManagerModule } from 'src/modules/messaging/message-import-manager/messaging-import-manager.module';
import { MessageParticipantManagerModule } from 'src/modules/messaging/message-participant-manager/message-participant-manager.module';
import { MessagingMonitoringModule } from 'src/modules/messaging/monitoring/messaging-monitoring.module';

import { ConversationChannelEntity } from 'src/modules/messaging/common/standard-objects/conversation-channel.entity';
import { ConversationService } from 'src/modules/messaging/conversation.service';
import { ConversationResolver } from 'src/modules/messaging/conversation.resolver';
import { WhatsAppWebhookController, WhatsAppWebhookDriver } from 'src/modules/messaging/whatsapp-webhook';
import { WebchatWebhookController, WebchatWebhookDriver } from 'src/modules/messaging/webchat-webhook';

@Module({
  imports: [
    MessagingImportManagerModule,
    MessagingMessageCleanerModule,
    MessageParticipantManagerModule,
    MessagingBlocklistManagerModule,
    MessagingMonitoringModule,
    TypeOrmModule.forFeature([ConversationChannelEntity]),
  ],
  providers: [
    ConversationService,
    ConversationResolver,
    WhatsAppWebhookDriver,
    WebchatWebhookDriver,
  ],
  controllers: [
    WhatsAppWebhookController,
    WebchatWebhookController,
  ],
})
export class MessagingModule {}
