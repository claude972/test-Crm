import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { HermesMessagingAccessService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMessagingPersonService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service';
import { HermesMessagingResolver } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.resolver';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

@Module({
  imports: [
    UserRoleModule,
    TypeOrmModule.forFeature([
      HermesConversationEntity,
      HermesInboxMessageEntity,
      UserWorkspaceEntity,
      RoleTargetEntity,
    ]),
  ],
  providers: [
    HermesMessagingAccessService,
    HermesMessagingAdapterRegistry,
    HermesMessagingPersonService,
    HermesMessagingService,
    HermesMessagingResolver,
    HermesProspectionAccessService,
  ],
  exports: [HermesMessagingAdapterRegistry, HermesMessagingService],
})
export class HermesMessagingModule {}
