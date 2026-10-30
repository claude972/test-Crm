import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HermesProspectionModule } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.module';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import { HermesEventController } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.controller';
import { HermesEventService } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { EmailingModule } from 'src/modules/emailing/emailing.module';

@Module({
  imports: [
    HermesProspectionModule,
    UserRoleModule,
    EmailingModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  controllers: [HermesEventController],
  providers: [HermesEventService, HermesIntakeReplayService],
})
export class HermesEventsModule {}
