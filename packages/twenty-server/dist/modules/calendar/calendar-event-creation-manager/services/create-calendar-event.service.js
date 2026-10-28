"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCalendarEventService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const calendar_event_creation_exception_1 = require("src/modules/calendar/calendar-event-creation-manager/exceptions/calendar-event-creation.exception");
let CreateCalendarEventService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CreateCalendarEventService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CreateCalendarEventService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        googleCalendarCreateEventService;
        microsoftCalendarCreateEventService;
        calDavCreateEventService;
        calendarSaveEventsService;
        logger = new common_1.Logger(CreateCalendarEventService.name);
        constructor(googleCalendarCreateEventService, microsoftCalendarCreateEventService, calDavCreateEventService, calendarSaveEventsService) {
            this.googleCalendarCreateEventService = googleCalendarCreateEventService;
            this.microsoftCalendarCreateEventService = microsoftCalendarCreateEventService;
            this.calDavCreateEventService = calDavCreateEventService;
            this.calendarSaveEventsService = calendarSaveEventsService;
        }
        async createComposedCalendarEvent(data) {
            switch (data.connectedAccount.provider) {
                case types_1.ConnectedAccountProvider.GOOGLE:
                    return this.googleCalendarCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
                case types_1.ConnectedAccountProvider.MICROSOFT:
                    return this.microsoftCalendarCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
                case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                    return this.calDavCreateEventService.createCalendarEvent(data.input, data.connectedAccount);
                default:
                    throw new calendar_event_creation_exception_1.CalendarEventCreationException(`Calendar event creation is not supported for provider ${data.connectedAccount.provider}`, calendar_event_creation_exception_1.CalendarEventCreationExceptionCode.PROVIDER_NOT_SUPPORTED);
            }
        }
        // Non-fatal on failure: the next provider sync reconciles the event via its external id
        async persistCalendarEvent(createdEvent, data, workspaceId) {
            try {
                const { calendarEventIds } = await this.calendarSaveEventsService.saveCalendarEventsAndEnqueueContactCreationJob([createdEvent], data.calendarChannel, data.connectedAccount, workspaceId);
                return calendarEventIds[0] ?? null;
            }
            catch (persistenceError) {
                this.logger.warn(`Failed to persist created calendar event (sync will recover): ${persistenceError}`);
                return null;
            }
        }
    };
    return CreateCalendarEventService = _classThis;
})();
exports.CreateCalendarEventService = CreateCalendarEventService;
