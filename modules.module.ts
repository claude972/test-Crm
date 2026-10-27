import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';
import { CalendarRdvService } from './calendar-rdv.service';
import { server } from './graphql.resolvers';
import { FormsModule } from './packages/twenty-server/src/modules/forms/forms.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      server,
    }),
    FormsModule,
  ],
  providers: [
    AvailabilityService,
    BookingService,
    CalendarRdvService,
  ],
})
export class ModulesModule {}
