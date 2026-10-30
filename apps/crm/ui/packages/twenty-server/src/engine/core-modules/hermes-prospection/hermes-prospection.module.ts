import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailingDomainModule } from 'src/engine/core-modules/emailing-domain/emailing-domain.module';
import { HermesImportStateEntity } from 'src/engine/core-modules/hermes-prospection/entities/hermes-import-state.entity';
import { HermesImportStateService } from 'src/engine/core-modules/hermes-prospection/hermes-import-state.service';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { HermesProspectionResolver } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.resolver';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { EmailingModule } from 'src/modules/emailing/emailing.module';

@Module({
  imports: [
    FeatureFlagModule,
    TypeOrmModule.forFeature([
      HermesImportStateEntity,
      UserWorkspaceEntity,
      RoleTargetEntity,
    ]),
    UserRoleModule,
    EmailingModule,
    EmailingDomainModule,
  ],
  exports: [HermesProspectionService],
  providers: [
    HermesImportStateService,
    HermesProspectionAccessService,
    HermesProspectionService,
    HermesProspectionResolver,
  ],
})
export class HermesProspectionModule {}
