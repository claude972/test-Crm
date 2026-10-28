import base from './jest.config.mjs';

export default {
  ...base,
  moduleNameMapper: {
    '^kovaa-lab-shared/(.*)$': '<rootDir>/../kovaa-lab-shared/src/$1',
    '^@/(.*)$': '<rootDir>/../kovaa-lab-shared/src/$1',
    ...base.moduleNameMapper,
  },
};
