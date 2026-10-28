export const Test = {
  createTestingModule: () => ({
    imports: () => ({
      imports: () => ({
        providers: () => ({
          compile: () => Promise.resolve({})
        })
      })
    })
  })
};
export class TestingModule {}
export type EachTestingContext<T = any> = T & { name?: string };
