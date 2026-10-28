import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class BookingService {
    private repository;
    constructor(repository: WorkspaceScopedRepository);
    bookSlot(params: any): void;
}
