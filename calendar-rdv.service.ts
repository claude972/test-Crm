import { WorkspaceScopedRepository } from './workspace-scoped-repository';
import { CreateCalendarEventService } from './create-calendar-event-service';

export class CalendarRdvService {
  private repository: WorkspaceScopedRepository;
  private createCalendarEventService: CreateCalendarEventService;

  constructor(repository: WorkspaceScopedRepository, createCalendarEventService: CreateCalendarEventService) {
    this.repository = repository;
    this.createCalendarEventService = createCalendarEventService;
  }

  createRDV(data: any) {
    // Logic to create an RDV
  }

  listRDV(params: any) {
    // Logic to list RDVs
  }
}