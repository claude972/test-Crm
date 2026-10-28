export const provideWorkspaceScopedRepository = (entity: Function) => ({
  provide: entity,
  useFactory: async () => ({})
});
