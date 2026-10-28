"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const availability_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/availability.service");
const booking_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/booking.service");
const calendar_rdv_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service");
const calendar_rdv_resolver_1 = require("src/modules/calendar/calendar-event-creation-manager/resolvers/calendar-rdv.resolver");
let ModulesModule = class ModulesModule {
};
exports.ModulesModule = ModulesModule;
exports.ModulesModule = ModulesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                server: calendar_rdv_resolver_1.server,
            }),
        ],
        providers: [
            availability_service_1.AvailabilityService,
            booking_service_1.BookingService,
            calendar_rdv_service_1.CalendarRdvService,
        ],
    })
], ModulesModule);
