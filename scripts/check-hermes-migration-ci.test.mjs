import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDisposableTarget,
  validateMigrationSql,
} from './check-hermes-migration-ci.mjs';

const checkout = '/synthetic/disposable-checkout';
const validEnv = () => ({
  GITHUB_ACTIONS: 'true',
  RUNNER_ENVIRONMENT: 'github-hosted',
  GITHUB_RUN_ID: '123456',
  GITHUB_WORKSPACE: checkout,
  PG_DATABASE_URL: 'postgres://postgres:123456@127.0.0.1:5432/p0_ci',
  REDIS_URL: 'redis://127.0.0.1:6379',
});
const up = [
  'CREATE TABLE "core"."hermesImportState" ("workspaceId" uuid NOT NULL, "state" jsonb NOT NULL DEFAULT \'{"version":1,"batches":[],"campaignIds":[]}\'::jsonb, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fixture" PRIMARY KEY ("workspaceId"))',
  'ALTER TABLE "core"."hermesImportState" ADD CONSTRAINT "FK_fixture" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
];
const down = [
  'ALTER TABLE "core"."hermesImportState" DROP CONSTRAINT "FK_fixture"',
  'DROP TABLE "core"."hermesImportState"',
];

test('accepts only the GitHub-hosted disposable database target', () => {
  assert.equal(assertDisposableTarget(validEnv(), checkout).pathname, '/p0_ci');
});

for (const [key, value] of [
  ['GITHUB_ACTIONS', 'false'],
  ['RUNNER_ENVIRONMENT', 'self-hosted'],
  ['GITHUB_RUN_ID', 'not-a-run'],
  ['GITHUB_WORKSPACE', '/original/user/repository'],
  ['REDIS_URL', 'redis://remote.example.test:6379'],
  [
    'PG_DATABASE_URL',
    'postgres://postgres:123456@remote.example.test:5432/p0_ci',
  ],
  ['PG_DATABASE_URL', 'postgres://postgres:123456@127.0.0.1:5432/production'],
  [
    'PG_DATABASE_URL',
    'postgres://postgres:private-preview-password@127.0.0.1:5432/p0_ci',
  ],
  ['PG_DATABASE_URL', 'postgres://postgres:123456@127.0.0.1:5433/p0_ci'],
  [
    'PG_DATABASE_URL',
    'postgres://postgres:123456@127.0.0.1:5432/p0_ci?host=remote.example.test',
  ],
  ['PG_DATABASE_URL', 'postgres://different-user:123456@127.0.0.1:5432/p0_ci'],
]) {
  test(`refuses unsafe ${key} override (${value.split(':')[0]})`, () => {
    assert.throws(() =>
      assertDisposableTarget({ ...validEnv(), [key]: value }, checkout),
    );
  });
}

test('accepts a reversible Hermes-only table/FK schema diff', () =>
  validateMigrationSql(up, down));

for (const [name, modifiedUp, modifiedDown] of [
  ['unrelated DDL', [...up, 'DROP TABLE "core"."person"'], down],
  [
    'second statement',
    [up[0] + '; DROP TABLE "core"."workspace"', up[1]],
    down,
  ],
  [
    'another target',
    [up[0].replace('hermesImportState', 'privateCustomerData'), up[1]],
    down,
  ],
  ['unsafe rollback', up, [down[0], 'DROP TABLE "core"."workspace"']],
  [
    'foreign key without cascade',
    [up[0], up[1].replace('CASCADE', 'NO ACTION')],
    down,
  ],
]) {
  test(`rejects ${name}`, () =>
    assert.throws(() => validateMigrationSql(modifiedUp, modifiedDown)));
}
