import { Module } from '@nestjs/common';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';

import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { CalDavCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/caldav/services/caldav-create-event.service';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { GoogleCalendarCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/google-calendar/services/google-calendar-create-event.service';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { MicrosoftCalendarCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/microsoft-calendar/services/microsoft-calendar-create-event.service';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { CalendarEventComposerService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-event-composer.service';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { CreateCalendarEventService } from 'src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { CalDavDriverModule } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/caldav-driver.module';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { CalendarEventImportManagerModule } from 'src/modules/calendar/calendar-event-import-manager/calendar-event-import-manager.module';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { OAuth2ClientManagerModule } from 'src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module';

import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectedAccountEntity, CalendarChannelEntity]),
    OAuth2ClientManagerModule,
    CalendarEventImportManagerModule,
    CalDavDriverModule,
  ],
  providers: [
    CalendarEventComposerService,
    CreateCalendarEventService,
    AvailabilityService,
    BookingService,
    CalendarRdvService,,
    GoogleCalendarCreateEventService,
    MicrosoftCalendarCreateEventService,
    CalDavCreateEventService,
  ],
  exports: [CalendarEventComposerService, CreateCalendarEventService,
    AvailabilityService,
    BookingService,
    CalendarRdvService,],
})
export class CalendarEventCreationManagerModule {}
