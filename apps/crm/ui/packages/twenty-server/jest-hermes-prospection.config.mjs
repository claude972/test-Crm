import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default {
  rootDir,
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/engine/core-modules/hermes-prospection/**/*.spec.ts',
    '<rootDir>/src/engine/core-modules/emailing-domain/utils/__tests__/get-sole-envelope-recipient.util.spec.ts',
    '<rootDir>/src/engine/core-modules/emailing-domain/services/__tests__/unsubscribe-content.service.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
  transform: {
    '^.+\\.(t|j)s$': [
      require.resolve('@swc/jest'),
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { decoratorMetadata: true },
          experimental: {
            plugins: [
              [
                require.resolve('@lingui/swc-plugin'),
                { stripNonEssentialFields: false },
              ],
            ],
          },
        },
      },
    ],
  },
  clearMocks: true,
  prettierPath: null,
  maxWorkers: 2,
};
