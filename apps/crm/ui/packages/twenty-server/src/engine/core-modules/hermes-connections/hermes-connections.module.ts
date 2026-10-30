import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

import { HermesConnectionEntity } from './hermes-connection.entity';
import { HermesConnectionsResolver } from './hermes-connections.resolver';
import { HermesConnectionsService } from './hermes-connections.service';

@Global()
@Module({
  imports: [
    SecretEncryptionModule,
    TypeOrmModule.forFeature([
      HermesConnectionEntity,
      UserWorkspaceEntity,
      RoleTargetEntity,
      ConnectedAccountEntity,
    ]),
  ],
  providers: [
    HermesProspectionAccessService,
    HermesConnectionsService,
    HermesConnectionsResolver,
    {
      provide: 'HERMES_CONNECTIONS_SERVICE',
      useExisting: HermesConnectionsService,
    },
  ],
  exports: [HermesConnectionsService, 'HERMES_CONNECTIONS_SERVICE'],
})
export class HermesConnectionsModule {}
