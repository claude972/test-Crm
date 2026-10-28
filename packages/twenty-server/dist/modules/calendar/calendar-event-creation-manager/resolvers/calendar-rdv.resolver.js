"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const apollo_server_1 = require("apollo-server");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const create_calendar_event_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service");
const calendar_rdv_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service");
const availability_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/availability.service");
const booking_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/booking.service");
const typeDefs = (0, apollo_server_1.gql) `
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
exports.server = new apollo_server_1.ApolloServer({
    typeDefs,
    resolvers,
    dataSources: () => ({
        calendarRdvService: new calendar_rdv_service_1.CalendarRdvService(new workspace_scoped_repository_1.WorkspaceScopedRepository(), new create_calendar_event_service_1.CreateCalendarEventService()),
        availabilityService: new availability_service_1.AvailabilityService(new workspace_scoped_repository_1.WorkspaceScopedRepository()),
        bookingService: new booking_service_1.BookingService(new workspace_scoped_repository_1.WorkspaceScopedRepository()),
    }),
});
