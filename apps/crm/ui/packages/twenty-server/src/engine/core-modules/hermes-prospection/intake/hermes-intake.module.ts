import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesMessagingConnectorsModule } from 'src/engine/core-modules/hermes-connectors/hermes-messaging-connectors.module';
import { HermesProspectionModule } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.module';
import { HermesEventsModule } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-events.module';
import { HermesInboundClassificationResolver } from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.resolver';
import { HermesInboundClassificationService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.service';
import { HermesIntakeController } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.controller';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import { HermesIntakeStateResolver } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.resolver';
import { HermesIntakeStateService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.service';
import { HermesIntakeService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.service';
import { HermesMcpToolSurfaceResolver } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.resolver';
import { HermesMcpToolSurfaceService } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';

@Module({
  // The classification read resolves the company's role and workspace exactly
  // as the event ingress does, so it needs the same two dependencies here.
  //
  // The connectors module is IMPORTED, never re-provided: it owns the single
  // HermesConnectedMcpAdapter instance that also registers the bot on its own
  // module init. Importing keeps one instance and one lifecycle, so the admin
  // tool surface reads the stored connection an operator actually configured
  // instead of silently falling back to the private configuration map.
  imports: [
    HermesProspectionModule,
    HermesEventsModule,
    HermesMessagingConnectorsModule,
    UserRoleModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  controllers: [HermesIntakeController],
  providers: [
    HermesIntakeService,
    HermesIntakeReplayService,
    HermesIntakeStateService,
    HermesIntakeStateResolver,
    HermesMcpToolSurfaceService,
    HermesMcpToolSurfaceResolver,
    HermesInboundClassificationService,
    HermesInboundClassificationResolver,
  ],
})
export class HermesIntakeModule {}
