import { WorkspaceScopedRepository } from './workspace-scoped-repository';

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