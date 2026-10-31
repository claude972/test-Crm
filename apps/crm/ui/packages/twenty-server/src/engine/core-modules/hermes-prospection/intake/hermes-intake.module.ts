import { Module } from '@nestjs/common';

import { HermesProspectionModule } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.module';
import { HermesEventsModule } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-events.module';
import { HermesIntakeController } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.controller';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import { HermesIntakeStateResolver } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.resolver';
import { HermesIntakeStateService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.service';
import { HermesIntakeService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.service';
import { HermesMcpToolSurfaceResolver } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.resolver';
import { HermesMcpToolSurfaceService } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.service';

@Module({
  imports: [HermesProspectionModule, HermesEventsModule],
  controllers: [HermesIntakeController],
  providers: [
    HermesIntakeService,
    HermesIntakeReplayService,
    HermesIntakeStateService,
    HermesIntakeStateResolver,
    HermesMcpToolSurfaceService,
    HermesMcpToolSurfaceResolver,
  ],
})
export class HermesIntakeModule {}
