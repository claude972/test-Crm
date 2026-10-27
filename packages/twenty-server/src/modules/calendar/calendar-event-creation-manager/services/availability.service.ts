import { Injectable } from '@nestjs/common';

import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';

@Injectable()
export class AvailabilityService {
  private repository: WorkspaceScopedRepository;

  constructor(repository: WorkspaceScopedRepository) {
    this.repository = repository;
  }

  getAvailability(params: any) {
    // Logic to get availability
  }

  getAvailableSlots(params: any) {
    // Logic to get available slots
  }
}