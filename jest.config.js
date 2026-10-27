module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  roots: ['packages/twenty-server/src'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/packages/twenty-server/src/$1'
  },
  verbose: true
};
