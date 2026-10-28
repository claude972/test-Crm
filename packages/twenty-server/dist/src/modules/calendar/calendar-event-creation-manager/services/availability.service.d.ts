import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class AvailabilityService {
    private repository;
    constructor(repository: WorkspaceScopedRepository);
    getAvailability(params: any): void;
    getAvailableSlots(params: any): void;
}
