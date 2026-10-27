import { Module } from '@nestjs/common';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';

import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';
import { ConnectedAccountModule } from 'src/modules/connected-account/connected-account.module';

import { AvailabilityEntity } from 'src/modules/calendar/common/standard-objects/availability.entity';
import { AvailabilityWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/availability.workspace-entity';
import { BookingSlotEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.entity';
import { BookingSlotWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/booking-slot.workspace-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarChannelEntity,
      ConnectedAccountEntity,
      UserWorkspaceEntity,
    
      AvailabilityEntity,
      AvailabilityWorkspaceEntity,
      BookingSlotEntity,
      BookingSlotWorkspaceEntity,
    ]),
    ConnectedAccountModule,
    MetricsModule,
  ],
  providers: [CalendarChannelSyncStatusService],
  exports: [CalendarChannelSyncStatusService],
})
export class CalendarCommonModule {}
