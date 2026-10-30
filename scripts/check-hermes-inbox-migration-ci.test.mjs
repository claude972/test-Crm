import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDisposableTarget,
  validateMigrationSql,
} from './check-hermes-inbox-migration-ci.mjs';

const checkout = '/synthetic/inbox-ci';
const valid = () => ({
  GITHUB_ACTIONS: 'true',
  RUNNER_ENVIRONMENT: 'github-hosted',
  GITHUB_RUN_ID: '123456',
  GITHUB_WORKSPACE: checkout,
  PG_DATABASE_URL: 'postgres://postgres:123456@127.0.0.1:5432/p0_ci',
  REDIS_URL: 'redis://127.0.0.1:6379',
});
const tables = ['hermesConversation', 'hermesInboxMessage', 'hermesMailCursor'];
const specifications = [
  [
    'IDX_HERMES_CONVERSATION_TENANT_ID',
    'hermesConversation',
    true,
    ['workspaceId', 'id'],
  ],
  [
    'IDX_HERMES_CONVERSATION_PROVIDER',
    'hermesConversation',
    true,
    [
      'workspaceId',
      'channel',
      'providerConnectionId',
      'providerConversationId',
    ],
  ],
  [
    'IDX_HERMES_CONVERSATION_INBOX',
    'hermesConversation',
    false,
    ['workspaceId', 'lastMessageAt', 'id'],
  ],
  [
    'IDX_HERMES_MESSAGE_PROVIDER',
    'hermesInboxMessage',
    true,
    ['workspaceId', 'channel', 'providerConnectionId', 'providerMessageId'],
    'providerMessageId',
  ],
  [
    'IDX_HERMES_MESSAGE_CLIENT',
    'hermesInboxMessage',
    true,
    ['workspaceId', 'clientRequestId'],
    'clientRequestId',
  ],
  [
    'IDX_HERMES_MESSAGE_INBOX',
    'hermesInboxMessage',
    false,
    ['workspaceId', 'conversationId', 'occurredAt', 'id'],
  ],
];
// Synthetic guard inputs only. Actual migration source/SQL must come from the official CLI.
const up = [
  ...tables.map(
    (name) =>
      `CREATE TABLE "core"."${name}" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL, CONSTRAINT "PK_fixture_${name}" PRIMARY KEY ("id"))`,
  ),
  ...specifications.map(
    ([name, table, unique, columns, where]) =>
      `CREATE ${unique ? 'UNIQUE ' : ''}INDEX "${name}" ON "core"."${table}" (${columns.map((c) => `"${c}"`).join(', ')})${where ? ` WHERE "${where}" IS NOT NULL` : ''}`,
  ),
  ...tables.map(
    (name, index) =>
      `ALTER TABLE "core"."${name}" ADD CONSTRAINT "FK_fixture_${index}" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  ),
  'ALTER TABLE "core"."hermesInboxMessage" ADD CONSTRAINT "FK_fixture_composite" FOREIGN KEY ("workspaceId", "conversationId") REFERENCES "core"."hermesConversation"("workspaceId", "id") ON DELETE CASCADE ON UPDATE NO ACTION',
];
const down = [
  ...up
    .filter((q) => q.startsWith('ALTER TABLE'))
    .map((q) =>
      q.replace(/ ADD CONSTRAINT "([^"]+)"[\s\S]+$/, ' DROP CONSTRAINT "$1"'),
    ),
  ...specifications.map(([name]) => `DROP INDEX "core"."${name}"`),
  ...[...tables].reverse().map((name) => `DROP TABLE "core"."${name}"`),
];
test('inherits the exact disposable run ID database and Redis guards', () =>
  assert.equal(assertDisposableTarget(valid(), checkout).pathname, '/p0_ci'));
for (const [key, value] of [
  ['GITHUB_ACTIONS', 'false'],
  ['RUNNER_ENVIRONMENT', 'self-hosted'],
  ['GITHUB_WORKSPACE', '/original'],
  ['GITHUB_RUN_ID', 'other'],
  ['PG_DATABASE_URL', 'postgres://postgres:private@127.0.0.1:5432/p0_ci'],
  [
    'PG_DATABASE_URL',
    'postgres://postgres:123456@remote.example.test:5432/p0_ci',
  ],
  ['PG_DATABASE_URL', 'postgres://postgres:123456@127.0.0.1:5432/production'],
  [
    'PG_DATABASE_URL',
    'postgres://postgres:123456@127.0.0.1:5432/p0_ci?host=remote',
  ],
  ['REDIS_URL', 'redis://remote.example.test:6379'],
])
  test(`rejects unsafe ${key} without starting a service`, () =>
    assert.throws(() =>
      assertDisposableTarget({ ...valid(), [key]: value }, checkout),
    ));
test('allows only the synthetic three-table additive shape and its precise inverse', () =>
  validateMigrationSql(up, down));
for (const [name, change] of [
  ['DML', (q) => q.replace('CREATE TABLE', 'INSERT INTO')],
  ['other table', (q) => q.replace('hermesConversation', 'workspace')],
  ['second statement', (q) => q + '; DROP TABLE "core"."workspace"'],
  ['comment', (q) => q + ' -- ignore'],
  [
    'data-copy SELECT',
    (q) =>
      q.replace(
        '"id" uuid NOT NULL',
        '"id" uuid DEFAULT (SELECT id FROM "core"."workspace")',
      ),
  ],
])
  test(`rejects ${name}`, () =>
    assert.throws(() =>
      validateMigrationSql([change(up[0]), ...up.slice(1)], down),
    ));
test('rejects FK without tenant composite', () =>
  assert.throws(() =>
    validateMigrationSql(
      [
        ...up.slice(0, -1),
        up
          .at(-1)
          .replace('"workspaceId", "conversationId"', '"conversationId"'),
      ],
      down,
    ),
  ));
test('rejects workspace FK without cascade', () =>
  assert.throws(() =>
    validateMigrationSql(
      up.map((q) => q.replace('ON DELETE CASCADE', 'ON DELETE NO ACTION')),
      down,
    ),
  ));
test('rejects missing index uniqueness', () =>
  assert.throws(() =>
    validateMigrationSql(
      up.map((q) => q.replace('CREATE UNIQUE INDEX', 'CREATE INDEX')),
      down,
    ),
  ));
test('rejects changed partial-index eligibility', () =>
  assert.throws(() =>
    validateMigrationSql(
      up.map((q) =>
        q.replace(
          'WHERE "providerMessageId" IS NOT NULL',
          'WHERE "clientRequestId" IS NOT NULL',
        ),
      ),
      down,
    ),
  ));
test('rejects altered rollback target', () =>
  assert.throws(() =>
    validateMigrationSql(up, [
      ...down.slice(0, -1),
      'DROP TABLE "core"."workspace"',
    ]),
  ));
test('rejects duplicate FK used to replace a workspace boundary', () =>
  assert.throws(() =>
    validateMigrationSql([...up.slice(0, -1), up.at(-2)], down),
  ));

test('rejects unrelated ImportState default normalization emitted by TypeORM', () => {
  assert.throws(
    () =>
      validateMigrationSql(
        [
          ...up,
          `ALTER TABLE "core"."hermesImportState" ALTER COLUMN "state" SET DEFAULT '{}'::jsonb`,
        ],
        [
          ...down,
          `ALTER TABLE "core"."hermesImportState" ALTER COLUMN "state" SET DEFAULT '{}'::jsonb`,
        ],
      ),
    /Only three CREATE TABLE/,
  );
});
