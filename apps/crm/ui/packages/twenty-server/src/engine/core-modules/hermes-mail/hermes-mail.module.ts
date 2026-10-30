import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesMailCursorEntity } from 'src/engine/core-modules/hermes-mail/hermes-mail-cursor.entity';
import { HermesMailResolver } from 'src/engine/core-modules/hermes-mail/hermes-mail.resolver';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { HermesMessagingPersonService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service';
import { HermesMailboxService } from 'src/engine/core-modules/hermes-mail/hermes-mailbox.service';
import { HermesMailService } from 'src/engine/core-modules/hermes-mail/hermes-mail.service';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { HermesMessagingModule } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.module';
import { HermesProspectionModule } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessagingIMAPDriverModule } from 'src/modules/messaging/message-import-manager/drivers/imap/messaging-imap-driver.module';
import { MessagingSmtpDriverModule } from 'src/modules/messaging/message-import-manager/drivers/smtp/messaging-smtp-driver.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectedAccountEntity,
      UserWorkspaceEntity,
      HermesMailCursorEntity,
      HermesConversationEntity,
      HermesInboxMessageEntity,
    ]),
    HermesMessagingModule,
    UserRoleModule,
    HermesProspectionModule,
    RedisClientModule,
    MessagingIMAPDriverModule,
    MessagingSmtpDriverModule,
  ],
  providers: [
    HermesMailService,
    HermesMailboxService,
    HermesMailResolver,
    HermesMessagingPersonService,
  ],
  exports: [HermesMailService],
})
export class HermesMailModule {}
