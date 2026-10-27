import { Module } from '@nestjs/common';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';

import { CalendarBlocklistManagerModule } from 'src/modules/calendar/blocklist-manager/calendar-blocklist-manager.module';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';
import { CalendarEventCleanerModule } from 'src/modules/calendar/calendar-event-cleaner/calendar-event-cleaner.module';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';
import { CalendarEventImportManagerModule } from 'src/modules/calendar/calendar-event-import-manager/calendar-event-import-manager.module';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';
import { CalendarEventParticipantManagerModule } from 'src/modules/calendar/calendar-event-participant-manager/calendar-event-participant-manager.module';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';
import { CalendarCommonModule } from 'src/modules/calendar/common/calendar-common.module';
import { CalendarEventCreationManagerModule } from 'src/modules/calendar/calendar-event-creation-manager/calendar-event-creation-manager.module';

@Module({
  imports: [
    CalendarEventCreationManagerModule,
    CalendarBlocklistManagerModule,
    CalendarEventCleanerModule,
    CalendarEventImportManagerModule,
    CalendarEventParticipantManagerModule,
    CalendarCommonModule,
  ],
  providers: [],
  exports: [],
})
export class CalendarModule {}
