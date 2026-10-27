export abstract class WorkspaceScopedRepository<T> {
  create(input: Partial<T>): Promise<T> { return Promise.resolve(input as T); }
  find(criteria: any): Promise<T[]> { return Promise.resolve([]); }
  update(id: string, input: Partial<T>): Promise<T | null> { return Promise.resolve(null); }
  remove(id: string): Promise<void> { return Promise.resolve(); }
}

export function provideWorkspaceScopedRepository<Entity>(repoClass: { new(): WorkspaceScopedRepository<Entity> }) {
  return { provide: repoClass, useClass: repoClass };
}
