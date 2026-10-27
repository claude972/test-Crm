import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { server } from 'src/modules/calendar/calendar-event-creation-manager/resolvers/calendar-rdv.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      server,
    }),
  ],
  providers: [
    AvailabilityService,
    BookingService,
    CalendarRdvService,
  ],
})
export class ModulesModule {}
