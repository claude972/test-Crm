import { Injectable } from '@nestjs/common';

import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CreateCalendarEventService } from 'src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service';

@Injectable()
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