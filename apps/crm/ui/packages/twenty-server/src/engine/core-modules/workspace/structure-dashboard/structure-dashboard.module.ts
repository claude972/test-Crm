import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { StructureDashboardResolver } from 'src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.resolver';
import { StructureDashboardService } from 'src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserWorkspaceEntity]),
    UserWorkspaceModule,
    WorkspaceDomainsModule,
  ],
  providers: [StructureDashboardService, StructureDashboardResolver],
})
export class StructureDashboardModule {}
