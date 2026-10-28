import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CreateCalendarEventService } from 'src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service';
export declare class CalendarRdvService {
    private repository;
    private createCalendarEventService;
    constructor(repository: WorkspaceScopedRepository, createCalendarEventService: CreateCalendarEventService);
    createRDV(data: any): void;
    listRDV(params: any): void;
}
