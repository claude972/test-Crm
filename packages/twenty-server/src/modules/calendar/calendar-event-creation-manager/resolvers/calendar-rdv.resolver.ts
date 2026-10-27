import { ApolloServer, gql } from 'apollo-server';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CreateCalendarEventService } from 'src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { AvailabilityService } from 'src/modules/calendar/calendar-event-creation-manager/services/availability.service';
import { BookingService } from 'src/modules/calendar/calendar-event-creation-manager/services/booking.service';

const typeDefs = gql`
  type Availability {
    id: ID!
    type: String!
    dayOfWeek: Int!
    startTime: String!
    endTime: String!
    date: String!
    memberId: String!
    workspaceId: String!
  }

  type BookingSlot {
    id: ID!
    availabilityId: String!
    startsAt: String!
    endsAt: String!
    status: String!
    bookedByPersonId: String
    calendarEventId: String
    workspaceId: String!
  }

  type Query {
    getAvailability(params: String): [Availability]
    getAvailableSlots(params: String): [BookingSlot]
  }

  type Mutation {
    createRDV(data: String): BookingSlot
    bookSlot(params: String): BookingSlot
  }
`;

const resolvers = {
  Query: {
    getAvailability: (_, { params }, { dataSources }) => {
      return dataSources.availabilityService.getAvailability(params);
    },
    getAvailableSlots: (_, { params }, { dataSources }) => {
      return dataSources.availabilityService.getAvailableSlots(params);
    },
  },
  Mutation: {
    createRDV: (_, { data }, { dataSources }) => {
      return dataSources.calendarRdvService.createRDV(data);
    },
    bookSlot: (_, { params }, { dataSources }) => {
      return dataSources.bookingService.bookSlot(params);
    },
  },
};

export const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    calendarRdvService: new CalendarRdvService(new WorkspaceScopedRepository(), new CreateCalendarEventService()),
    availabilityService: new AvailabilityService(new WorkspaceScopedRepository()),
    bookingService: new BookingService(new WorkspaceScopedRepository()),
  }),
});