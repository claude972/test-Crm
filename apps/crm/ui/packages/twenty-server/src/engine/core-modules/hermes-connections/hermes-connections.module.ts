import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountTokenEncryptionModule } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.module';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { MessagingIMAPDriverModule } from 'src/modules/messaging/message-import-manager/drivers/imap/messaging-imap-driver.module';
import { MessagingSmtpDriverModule } from 'src/modules/messaging/message-import-manager/drivers/smtp/messaging-smtp-driver.module';

import { HermesConnectionEntity } from './hermes-connection.entity';
import { HermesConnectionTestService } from './hermes-connection-test.service';
import { HermesConnectionsResolver } from './hermes-connections.resolver';
import { HermesConnectionsService } from './hermes-connections.service';

@Global()
@Module({
  imports: [
    SecretEncryptionModule,
    ConnectedAccountTokenEncryptionModule,
    TypeOrmModule.forFeature([
      HermesConnectionEntity,
      HermesConversationEntity,
      HermesBotPolicyEntity,
      UserWorkspaceEntity,
      RoleTargetEntity,
      ConnectedAccountEntity,
    ]),
    // The existing native IMAP and SMTP client providers. The connection test
    // opens its sessions through them rather than building a transport of its
    // own, so it inherits the established host validation, TLS options and
    // encrypted-credential handling instead of duplicating any of it.
    MessagingIMAPDriverModule,
    MessagingSmtpDriverModule,
  ],
  providers: [
    HermesProspectionAccessService,
    HermesConnectionsService,
    HermesConnectionTestService,
    HermesConnectionsResolver,
    {
      provide: 'HERMES_CONNECTIONS_SERVICE',
      useExisting: HermesConnectionsService,
    },
  ],
  exports: [HermesConnectionsService, 'HERMES_CONNECTIONS_SERVICE'],
})
export class HermesConnectionsModule {}
