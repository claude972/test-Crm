import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync, execFileSync } from 'node:child_process';
import { actionCommands, assertCronSummary, assertUpgradeSummary, assertDatabaseState, readUpgradeSummary, commandDiagnostic, main, runCommands, validateEnvironment } from './entrypoint.mjs';
import { createRequire } from 'node:module';
import { CLIENT_SDK_ENTRYPOINTS, readMigrationDiagnostic, validateSmokeEnvironment } from '../../scripts/check-hermes-staging-image.mjs';

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
  assert.match(dockerfile, /HERMES_SOURCE_SHA/);
  assert.match(dockerfile, /dist\/front\/KOVAALABCRM_SOURCE.txt/);
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

test('real tracked SDK/CLI build source survives context filtering while outputs and secrets do not', () => {
  const root = new URL('../../', import.meta.url);
  const tracked = execFileSync('git', ['ls-files', '-z', ':(glob)apps/crm/ui/**/build/**', ':(glob)apps/crm/ui/**/dist/**'], { cwd: root }).toString().split('\0').filter((file) => /\/(build|dist)\//.test(file));
  assert.ok(tracked.includes('apps/crm/ui/packages/twenty-sdk/src/front-component-renderer/build/index.ts'));
  assert.ok(tracked.includes('apps/crm/ui/packages/twenty-cli/src/commands/app/build/run-app-build-command.ts'));
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-context-test-'));
  try {
    execFileSync('git', ['init', '--quiet', temporary]);
    writeFileSync(path.join(temporary, '.gitignore'), source('Dockerfile.dockerignore'));
    const excluded = ['apps/crm/ui/packages/twenty-front/build/index.html', 'apps/crm/ui/packages/twenty-server/dist/main.js', 'apps/crm/ui/.env', 'apps/crm/ui/packages/twenty-server/.env.production', 'apps/crm/ui/node_modules/anything.js', 'apps/crm/bot/index.ts'];
    const syntheticSource = ['apps/crm/ui/packages/twenty-sdk/src/example/dist/index.ts', 'apps/crm/ui/packages/twenty-sdk/src/secret/token.ts'];
    const candidates = [...tracked, ...syntheticSource, ...excluded];
    const result = spawnSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '--no-index', '--stdin', '-z'], { cwd: temporary, input: candidates.join('\0') + '\0', encoding: 'utf8' });
    assert.equal(result.status, 0);
    const ignored = new Set(result.stdout.split('\0').filter(Boolean));
    for (const file of [...tracked, ...syntheticSource]) assert.equal(ignored.has(file), false, `Required source excluded: ${file}`);
    for (const file of excluded) assert.equal(ignored.has(file), true, `Private/output file included: ${file}`);
    assert.doesNotMatch(source('Dockerfile.dockerignore'), /^\*\*\/(?:build|dist)$/m);
    writeFileSync(path.join(temporary, '.gitignore'), source('Dockerfile.dockerignore') + '\n**/build\n');
    const regression = spawnSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '--no-index', '--stdin', '-z'], { cwd: temporary, input: tracked.join('\0') + '\0', encoding: 'utf8' });
    assert.ok(regression.stdout.split('\0').includes('apps/crm/ui/packages/twenty-sdk/src/front-component-renderer/build/index.ts'), 'Original broad exclusion must reproduce the lost source');
  } finally { rmSync(temporary, { recursive: true }); }
});

test('production prune checks native constraints before removing their development-only loader', () => {
  const build = source('build.mjs');
  assert.match(build, /command\(\[yarn, 'install', '--immutable'\]\);/);
  const constraints = build.indexOf("command([yarn, 'constraints']);");
  const focus = build.indexOf("command([yarn, 'workspaces', 'focus', '--production'");
  assert.ok(constraints > build.indexOf("cpSync(path.join(root, 'packages/twenty-front/build')") && focus > constraints);
  assert.equal((build.match(/YARN_ENABLE_CONSTRAINTS_CHECKS/g) ?? []).length, 1);
  assert.match(build.slice(focus), /\], root, \{ YARN_ENABLE_CONSTRAINTS_CHECKS: 'false' \}\);/);
  assert.doesNotMatch(source('Dockerfile'), /YARN_ENABLE_CONSTRAINTS_CHECKS/);
  assert.match(readFileSync(new URL('../../apps/crm/ui/.yarnrc.yml', import.meta.url), 'utf8'), /enableConstraintsChecks: true/);
  const nativeHook = readFileSync(new URL('../../apps/crm/ui/yarn.config.cjs', import.meta.url), 'utf8');
  assert.match(nativeHook, /require\('@yarnpkg\/types'\)/);
  assert.match(nativeHook, /semver.satisfies\(currentNodeVersion, requiredNodeVersion\)/);
});

test('image module probe uses actual client SDK subpath exports, whose root is forbidden', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../apps/crm/ui/packages/twenty-client-sdk/package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.exports['.'], undefined);
  assert.deepEqual(CLIENT_SDK_ENTRYPOINTS.map((entry) => `./${entry}`), Object.keys(manifest.exports));
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-sdk-exports-test-'));
  try {
    const sdk = path.join(temporary, 'node_modules', manifest.name);
    mkdirSync(sdk, { recursive: true });
    writeFileSync(path.join(sdk, 'package.json'), JSON.stringify(manifest));
    const require = createRequire(path.join(temporary, 'probe.cjs'));
    for (const entry of CLIENT_SDK_ENTRYPOINTS) {
      const output = path.resolve(sdk, manifest.exports[`./${entry}`].require);
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, 'module.exports = {};');
      assert.equal(require.resolve(`${manifest.name}/${entry}`), realpathSync(output));
    }
    assert.throws(() => require.resolve(manifest.name), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    const smoke = readFileSync(new URL('../../scripts/check-hermes-staging-image.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(smoke, /require.resolve\('kovaa-lab-client-sdk'\)/);
    assert.match(smoke, /report.failurePhase = phase/);
  } finally { rmSync(temporary, { recursive: true }); }
});

test('source SHA stamping happens only after exact-context compilation and runtime copy', () => {
  const dockerfile = source('Dockerfile');
  const build = source('build.mjs');
  assert.doesNotMatch(build, /HERMES_SOURCE_SHA|KOVAALABCRM_SOURCE/);
  const runtime = dockerfile.indexOf('FROM base AS runtime');
  assert.ok(runtime > 0);
  assert.doesNotMatch(dockerfile.slice(0, runtime), /ARG HERMES_SOURCE_SHA/);
  const argument = dockerfile.indexOf('ARG HERMES_SOURCE_SHA');
  assert.ok(argument > dockerfile.lastIndexOf('COPY '));
  assert.match(dockerfile.slice(argument), /assert.match\(sha \?\? '', \/\^\[a-f0-9\]\{40\}\$\/\)/);
  assert.match(dockerfile.slice(argument), /writeFileSync\('dist\/front\/KOVAALABCRM_SOURCE.txt', sha/);
});

test('migration diagnostics reveal only allowlisted command/category/key/code, never native buffers', () => {
  const secret = 'a'.repeat(64);
  const native = `Cannot find module /private/${secret} SQL postgres://user:${secret}@db`;
  assert.deepEqual(commandDiagnostic(['dist/database/scripts/setup-db.js'], native, 1), { action: 'migrate', command: 'setup-db', category: 'module-missing', exitCode: 1 });
  assert.equal(commandDiagnostic(['dist/command/command.js', 'upgrade'], 'Config validation APP_SECRET must be a string', 1).configKey, 'APP_SECRET');
  const safe = { action: 'migrate', command: 'upgrade', category: 'schema', exitCode: 1 };
  const output = native + '\nKOVAALABCRM_MIGRATION_FAILURE ' + JSON.stringify({ ...safe, url: `postgres://user:${secret}@db`, sql: 'private query', configKey: secret });
  assert.deepEqual(readMigrationDiagnostic(output, [secret]), safe);
  assert.equal(readMigrationDiagnostic('KOVAALABCRM_MIGRATION_FAILURE ' + JSON.stringify({ ...safe, command: secret }), [secret]), undefined);
  assert.equal(readMigrationDiagnostic(output + '\nKOVAALABCRM_MIGRATION_FAILURE {}', [secret]), undefined);
  assert.equal(readMigrationDiagnostic('KOVAALABCRM_MIGRATION_FAILURE not-json ' + secret, [secret]), undefined);
});
test('SMTP smoke uses a reserved HTTPS application origin independently of loopback HTTP probes', () => {
  const smoke = readFileSync(new URL('../../scripts/check-hermes-staging-image.mjs', import.meta.url), 'utf8');
  assert.match(smoke, /const smokeOrigin = 'https:\/\/kovaalabcrm-staging.test'/);
  assert.match(smoke, /const origin = `http:\/\/127\.0\.0\.1:/);
  const driver = readFileSync(new URL('../../apps/crm/ui/packages/twenty-server/src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver.ts', import.meta.url), 'utf8');
  assert.match(driver, /https:/);
});

test('native summary parser normalizes ANSI/CRLF and bounded Nest info teardown without accepting bad health', () => {
  const output = '\u001b[1m\u001b[4mSummary\u001b[24m\u001b[22m\r\n  Instance: \u001b[32mUp to date\u001b[39m\r\n  No workspaces\r\n[Nest] 17  - 10/31/2026, 8:00:00 PM     LOG [ModuleService] Closed\r\n';
  assert.doesNotThrow(() => assertUpgradeSummary(output));
  assert.deepEqual(readUpgradeSummary(output), { summaryCount: 1, instanceHealth: 'up-to-date', noWorkspaces: true, retrievalFailed: false, unexpectedLineCount: 0 });
  for (const bad of [output.replace('Up to date', 'Behind'), output.replace('Up to date', 'Failed'), output.replace('LOG', 'ERROR'), output + 'private unknown line']) assert.throws(() => assertUpgradeSummary(bad));
  const diagnostic = commandDiagnostic(['dist/command/command.js', 'upgrade:status'], 'Summary\n  Instance: Behind\n  Workspaces: 1 up to date, 2 behind, 3 failed (6 total)', 0, 'upgrade-summary');
  const parsed = readMigrationDiagnostic('KOVAALABCRM_MIGRATION_FAILURE ' + JSON.stringify(diagnostic), []);
  assert.equal(parsed.upgradeStatus.instanceHealth, 'behind');
  assert.deepEqual(parsed.upgradeStatus.workspaceCounts, { upToDate: 1, behind: 2, failed: 3, total: 6 });
});
