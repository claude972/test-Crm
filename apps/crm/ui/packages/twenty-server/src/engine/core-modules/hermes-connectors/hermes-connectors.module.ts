import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesConnectorsResolver } from 'src/engine/core-modules/hermes-connectors/hermes-connectors.resolver';
import { HermesConnectorsService } from 'src/engine/core-modules/hermes-connectors/hermes-connectors.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserWorkspaceEntity, RoleTargetEntity])],
  providers: [HermesConnectorsService, HermesConnectorsResolver],
})
export class HermesConnectorsModule {}
