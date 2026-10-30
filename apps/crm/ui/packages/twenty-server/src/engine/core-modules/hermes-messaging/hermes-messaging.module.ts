import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import { HermesMediaResolver } from 'src/engine/core-modules/hermes-media/hermes-media.resolver';
import { HermesMediaController } from 'src/engine/core-modules/hermes-media/hermes-media.controller';
import { HermesMediaAssetEntity } from 'src/engine/core-modules/hermes-media/hermes-media.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
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
    TokenModule,
    WorkspaceCacheStorageModule,
    FileModule,
    JwtModule,
    TypeOrmModule.forFeature([
      HermesConversationEntity,
      HermesMediaAssetEntity,
      HermesBotPolicyEntity,
      HermesInboxMessageEntity,
      UserWorkspaceEntity,
      RoleTargetEntity,
    ]),
  ],
  providers: [
    HermesMessagingAccessService,
    HermesMediaService,
    { provide: 'HERMES_MEDIA_SERVICE', useExisting: HermesMediaService },
    HermesMediaResolver,
    HermesMessagingAdapterRegistry,
    HermesMessagingPersonService,
    HermesMessagingService,
    HermesMessagingResolver,
    HermesProspectionAccessService,
  ],
  controllers: [HermesMediaController],
  exports: [
    HermesMediaService,
    { provide: 'HERMES_MEDIA_SERVICE', useExisting: HermesMediaService },
    HermesMessagingAdapterRegistry,
    HermesMessagingService,
  ],
})
export class HermesMessagingModule {}
