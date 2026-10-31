import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { actionCommands, assertCronSummary, assertUpgradeSummary, assertDatabaseState, main, runCommands, validateEnvironment } from './entrypoint.mjs';
import { validateSmokeEnvironment } from '../../scripts/check-hermes-staging-image.mjs';

const environment = (extra = {}) => ({
  PG_DATABASE_URL: `postgres://kovaalabcrm:${'a'.repeat(64)}@db:5432/kovaalabcrm_staging`,
  REDIS_URL: `redis://:${'b'.repeat(64)}@redis:6379/0`, APP_SECRET: 'c'.repeat(64), ENCRYPTION_KEY: 'd'.repeat(64),
  SERVER_URL: 'https://crm-recette.kovvalab.online', FRONTEND_URL: 'https://crm-recette.kovvalab.online',
  APP_VERSION: '2.52.0', REDIS_QUEUE_PREFIX: 'kovaalabcrm-staging', REDIS_CACHE_PREFIX: 'kovaalabcrm-staging', STORAGE_TYPE: 'local', STORAGE_LOCAL_PATH: '/app/packages/twenty-server/.local-storage', KOVAALABCRM_STAGING_SOURCE_SHA: 'e'.repeat(40), ...extra,
});
const source = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

test('dedicated staging configuration validates without network or application imports', () => {
  assert.doesNotThrow(() => validateEnvironment(environment()));
});
test('no default or short secrets, foreign database or Redis connection override is accepted', () => {
  for (const extra of [{ APP_SECRET: '' }, { ENCRYPTION_KEY: 'change-me' },
    { PG_DATABASE_URL: `postgres://kovaalabcrm:${'a'.repeat(64)}@db:5432/production` },
    { PG_DATABASE_URL: 'postgres://kovaalabcrm:short@db/kovaalabcrm_staging' },
    { REDIS_URL: 'redis://redis:6379/0' }, { REDIS_CACHE_PREFIX: 'production' },
    { PG_DATABASE_URL: `postgres://kovaalabcrm:${'a'.repeat(64)}@foreign/kovaalabcrm_staging` }, { REDIS_URL: `redis://:${'b'.repeat(64)}@redis/1` },
    { REDIS_URL: `redis://:${'b'.repeat(64)}@redis/0?socket=override` },
  ]) assert.throws(() => validateEnvironment(environment(extra)));
});
test('same-origin HTTPS is required and plaintext smoke needs both isolated runner flags', () => {
  const local = { SERVER_URL: 'http://127.0.0.1:15000', FRONTEND_URL: 'http://127.0.0.1:15000' };
  assert.throws(() => validateEnvironment(environment(local)));
  assert.throws(() => validateEnvironment(environment({ ...local, KOVAALABCRM_STAGING_SMOKE: 'true' })));
  assert.doesNotThrow(() => validateEnvironment(environment({ ...local, KOVAALABCRM_STAGING_SMOKE: 'true', GITHUB_ACTIONS: 'true' })));
  assert.throws(() => validateEnvironment(environment({ FRONTEND_URL: 'https://other.example.test' })));
  assert.throws(() => validateEnvironment(environment({ FRONTEND_URL: 'https://user:password@crm-recette.kovvalab.online' })));
});
test('storage, TLS verification, SSRF protection and prefilled login cannot be weakened', () => {
  for (const extra of [{ STORAGE_TYPE: 's3' }, { STORAGE_LOCAL_PATH: '/existing-production' },
    { OUTBOUND_HTTP_SAFE_MODE_ENABLED: 'false' }, { IMAP_SMTP_ALLOW_SELF_SIGNED: 'true' }, { SIGN_IN_PREFILLED: 'true' },
  ]) assert.throws(() => validateEnvironment(environment(extra)));
});
test('migration requires explicit opt-in before importing the application database driver', async () => {
  await assert.rejects(main(environment(), 'migrate'), /migration opt-in/);
});
test('initial migration and upgrade paths differ, unknown runtime commands are refused', () => {
  assert.deepEqual(actionCommands('server'), [['dist/main.js']]);
  assert.deepEqual(actionCommands('worker'), [['dist/queue-worker/queue-worker.js']]);
  assert.equal(actionCommands('migrate', false)[0][0], 'dist/database/scripts/setup-db.js');
  assert.deepEqual(actionCommands('migrate', true)[0], ['dist/command/command.js', 'cache:flush']);
  assert.ok(actionCommands('migrate', true).some((args) => args[1] === 'upgrade:status'));
  assert.throws(() => actionCommands('sh'));
});
test('failure or cancellation stops the migration sequence before cache/cron/server work', async () => {
  const visited = [];
  await assert.rejects(runCommands(actionCommands('migrate', false), {}, async (args) => {
    visited.push(args); throw new Error('synthetic command failure');
  }), /synthetic command failure/);
  assert.equal(visited.length, 1);
  assert.deepEqual(visited[0], ['dist/database/scripts/setup-db.js']);
});
test('runtime and build use the same pinned glibc base and the actual twenty directories', () => {
  const dockerfile = source('Dockerfile');
  assert.match(dockerfile, /FROM node:24-bookworm-slim@sha256:[a-f0-9]{64} AS base/);
  assert.match(dockerfile, /FROM base AS build/); assert.match(dockerfile, /FROM base AS runtime/);
  assert.doesNotMatch(dockerfile, /alpine|COPY .*packages\/kovaa-lab/);
  assert.match(dockerfile, /COPY apps\/crm\/ui\//);
  assert.match(dockerfile, /USER 1000:1000/);
  assert.match(dockerfile, /org.opencontainers.image.revision/);
  assert.match(source('build.mjs'), /HERMES_SOURCE_SHA/);
  assert.match(source('build.mjs'), /dist\/front\/KOVAALABCRM_SOURCE.txt/);
});
test('build context excludes private state and unrelated apps without dropping secret-related source modules', () => {
  const ignore = source('Dockerfile.dockerignore');
  for (const value of ['**/.git', '**/node_modules', '**/.env', '**/.env.*', '**/.runtime', '**/.local-storage', '**/.backups', '**/.secrets']) assert.ok(ignore.includes(value));
  assert.ok(ignore.startsWith('**\n'));
  assert.ok(!ignore.includes('!apps/crm/bot'));
  assert.ok(!ignore.includes('**/*secret*'));
});
test('Compose isolates names/data/ports and all application roles reference one image anchor', () => {
  const compose = source('compose.yaml');
  assert.match(compose, /^name: kovaalabcrm-staging/);
  assert.equal((compose.match(/<<: \*application\n/g) ?? []).length, 3);
  assert.match(compose, /condition: service_completed_successfully/);
  assert.match(compose, /127\.0\.0\.1:\$\{KOVAALABCRM_STAGING_BIND_PORT:\?/);
  assert.match(compose, /postgres:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /redis:\/data/);
  assert.match(compose, /--appendonly yes/);
  assert.match(compose, /data: \{internal: true\}/);
  assert.doesNotMatch(compose, /container_name:|external:|image: .*latest|Caddy|Evolution|Odoo/);
});
test('smoke refuses local machines, unpinned references and public report paths outside runner temp', () => {
  assert.throws(() => validateSmokeEnvironment({}));
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-packaging-test-'));
  try {
    const base = { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_TEMP: temporary, HERMES_SOURCE_SHA: 'a'.repeat(40), HERMES_STAGING_IMAGE: `kovaalabcrm-staging:${'a'.repeat(40)}` };
    assert.doesNotThrow(() => validateSmokeEnvironment(base));
    assert.throws(() => validateSmokeEnvironment({ ...base, HERMES_STAGING_IMAGE: 'upstream:latest' }));
    assert.throws(() => validateSmokeEnvironment({ ...base, HERMES_STAGING_REPORT_FILE: '/outside/runner/report.json' }));
  } finally { rmSync(temporary, { recursive: true }); }
});

test('cron command exit0 is not enough: missing/failed/zero summaries fail closed', () => {
  assert.doesNotThrow(() => assertCronSummary('Cron job registration completed: 20 successful, 0 failed, 4 skipped'));
  for (const output of ['', 'Cron job registration completed: 19 successful, 1 failed, 4 skipped', 'Cron job registration completed: 0 successful, 0 failed, 24 skipped', 'Cron job registration completed: 1 successful, 0 failed, 0 skipped\nCron job registration completed: 1 successful, 0 failed, 0 skipped']) assert.throws(() => assertCronSummary(output));
});

test('native status exit0 cannot hide errors, behind instances or workspaces', () => {
  for (const output of ['Summary\n  Instance: Up to date\n  No workspaces', 'Summary\n  Instance: Up to date\n  Workspaces: 2 up to date, 0 behind, 0 failed (2 total)']) assert.doesNotThrow(() => assertUpgradeSummary(output));
  for (const output of ['', 'Failed to retrieve upgrade status: synthetic', 'Summary\n  Instance: Behind\n  No workspaces', 'Summary\n  Instance: Up to date\n  Workspaces: 1 up to date, 1 behind, 0 failed (2 total)', 'Summary\n  Instance: Up to date\n  Workspaces: 1 up to date, 0 behind, 0 failed (2 total)']) assert.throws(() => assertUpgradeSummary(output));
});
test('partial bootstrap and unowned preexisting databases cannot be silently adopted', () => {
  assert.equal(assertDatabaseState({ tableCount: 0, markerPresent: false }), false);
  assert.equal(assertDatabaseState({ tableCount: 30, markerPresent: true, complete: true }), true);
  for (const state of [{ tableCount: 1, markerPresent: false }, { tableCount: 30, markerPresent: true, complete: false }, { tableCount: 30, markerPresent: true }]) assert.throws(() => assertDatabaseState(state));
});
