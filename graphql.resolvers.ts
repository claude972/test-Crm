import { ApolloServer, gql } from 'apollo-server';
import { WorkspaceScopedRepository } from './workspace-scoped-repository';
import { CreateCalendarEventService } from './create-calendar-event-service';
import { CalendarRdvService } from './calendar-rdv.service';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';

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

  type Form {
    id: ID!
    name: String!
    description: String
    fields: JSON
    isActive: Boolean!
    workspaceId: String!
    createdAt: String!
    updatedAt: String!
    deletedAt: String
  }

  type Question {
    id: ID!
    formId: String!
    title: String!
    kind: String!
    validations: JSON
    properties: JSON
    index: Int!
    workspaceId: String!
    createdAt: String!
    updatedAt: String!
    deletedAt: String
  }

  type FormResponse {
    id: ID!
    formId: String!
    personId: String
    companyId: String
    answers: JSON!
    submittedAt: String!
    status: String!
    workspaceId: String!
    createdAt: String!
    updatedAt: String!
    deletedAt: String
  }

  type Query {
    getAvailability(params: String): [Availability]
    getAvailableSlots(params: String): [BookingSlot]
    listForms(formId: String, workspaceId: String): [Form]
    listFormResponses(formId: String, workspaceId: String): [FormResponse]
  }

  type Mutation {
    createRDV(data: String): BookingSlot
    bookSlot(params: String): BookingSlot
    createForm(data: JSON): Form
    submitResponse(data: JSON): FormResponse
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