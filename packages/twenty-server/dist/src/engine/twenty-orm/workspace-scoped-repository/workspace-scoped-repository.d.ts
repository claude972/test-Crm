export declare abstract class WorkspaceScopedRepository<T> {
    create(input: Partial<T>): Promise<T>;
    find(criteria: any): Promise<T[]>;
    update(id: string, input: Partial<T>): Promise<T | null>;
    remove(id: string): Promise<void>;
}
export declare function provideWorkspaceScopedRepository<Entity>(repoClass: {
    new (): WorkspaceScopedRepository<Entity>;
}): {
    provide: new () => WorkspaceScopedRepository<Entity>;
    useClass: new () => WorkspaceScopedRepository<Entity>;
};
