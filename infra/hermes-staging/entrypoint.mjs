import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SERVER_DIRECTORY = '/app/packages/twenty-server';
export const VALIDATION_KEYS = Object.freeze(['PG_DATABASE_URL', 'REDIS_URL', 'REDIS_QUEUE_PREFIX', 'REDIS_CACHE_PREFIX', 'APP_SECRET', 'ENCRYPTION_KEY', 'SERVER_URL', 'FRONTEND_URL', 'STORAGE_TYPE', 'STORAGE_LOCAL_PATH', 'OUTBOUND_HTTP_SAFE_MODE_ENABLED', 'IMAP_SMTP_ALLOW_SELF_SIGNED', 'SIGN_IN_PREFILLED', 'APP_VERSION', 'KOVAALABCRM_STAGING_SOURCE_SHA', 'KOVAALABCRM_ALLOW_STAGING_MIGRATIONS']);
function validate(key, check) {
  try { return check(); } catch (error) { error.stagingValidationKey = key; throw error; }
}
export function validateEnvironment(environment) {
  validate('PG_DATABASE_URL', () => {
    const postgres = new URL(environment.PG_DATABASE_URL);
    assert.ok(['postgres:', 'postgresql:'].includes(postgres.protocol));
    assert.equal(postgres.pathname, '/kovaalabcrm_staging');
    assert.equal(postgres.hostname, 'db');
    assert.ok(postgres.username && decodeURIComponent(postgres.password).length >= 32);
    assert.equal(postgres.search, '');
  });
  validate('REDIS_URL', () => {
    const redis = new URL(environment.REDIS_URL);
    assert.equal(redis.protocol, 'redis:'); assert.equal(redis.hostname, 'redis');
    assert.ok(decodeURIComponent(redis.password).length >= 32);
    assert.ok(['', '/0'].includes(redis.pathname)); assert.equal(redis.search, '');
  });
  for (const key of ['REDIS_QUEUE_PREFIX', 'REDIS_CACHE_PREFIX']) validate(key, () => assert.equal(environment[key], 'kovaalabcrm-staging'));
  for (const key of ['APP_SECRET', 'ENCRYPTION_KEY']) validate(key, () => assert.match(environment[key] ?? '', /^[a-f0-9]{64}$/));
  const server = validate('SERVER_URL', () => new URL(environment.SERVER_URL));
  const frontend = validate('FRONTEND_URL', () => new URL(environment.FRONTEND_URL));
  validate('FRONTEND_URL', () => assert.equal(server.origin, frontend.origin));
  for (const [key, origin] of [['SERVER_URL', server], ['FRONTEND_URL', frontend]]) validate(key, () => {
    assert.equal(origin.username + origin.password + origin.search + origin.hash, ''); assert.equal(origin.pathname, '/');
  });
  const isolatedSmoke = environment.KOVAALABCRM_STAGING_SMOKE === 'true' && environment.GITHUB_ACTIONS === 'true';
  validate('SERVER_URL', () => assert.ok(server.protocol === 'https:' || (isolatedSmoke && server.protocol === 'http:' && server.hostname === '127.0.0.1')));
  validate('STORAGE_TYPE', () => assert.equal(environment.STORAGE_TYPE, 'local'));
  validate('STORAGE_LOCAL_PATH', () => assert.equal(environment.STORAGE_LOCAL_PATH, `${SERVER_DIRECTORY}/.local-storage`));
  for (const [key, value] of [['OUTBOUND_HTTP_SAFE_MODE_ENABLED', 'true'], ['IMAP_SMTP_ALLOW_SELF_SIGNED', 'false'], ['SIGN_IN_PREFILLED', 'false']]) validate(key, () => assert.equal(environment[key] ?? value, value));
  validate('APP_VERSION', () => assert.equal(environment.APP_VERSION, '2.52.0'));
  validate('KOVAALABCRM_STAGING_SOURCE_SHA', () => assert.match(environment.KOVAALABCRM_STAGING_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/));
}
export function actionCommands(action, initialized) {
  if (action === 'server') return [['dist/main.js']];
  if (action === 'worker') return [['dist/queue-worker/queue-worker.js']];
  if (action === 'migrate') return [
    ...(!initialized ? [['dist/database/scripts/setup-db.js'], ['dist/command/command.js', 'run-instance-commands', '--force', '--include-slow']] : []),
    ['dist/command/command.js', 'cache:flush'],
    ['dist/command/command.js', 'upgrade'],
    ['dist/command/command.js', 'cache:flush'],
    ['dist/command/command.js', 'upgrade:status'],
    ['dist/command/command.js', 'cron:register:all'],
  ];
  throw new Error('Only server, worker, migrate or health are supported');
}
export function assertCronSummary(output) {
  const clean = output.replace(/\u001b\[[0-9;]*m/g, '');
  const summaries = [...clean.matchAll(/Cron job registration completed: (\d+) successful, (\d+) failed, (\d+) skipped/g)];
  assert.equal(summaries.length, 1, 'Cron registration must publish one readable result');
  assert.ok(Number(summaries[0][1]) > 0 && Number(summaries[0][2]) === 0, 'Cron registration reported failure or registered no jobs');
}
export function readUpgradeSummary(output) {
  const lines = output.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim());
  const headings = lines.flatMap((line, index) => line === 'Summary' ? [index] : []);
  const details = { summaryCount: headings.length, instanceHealth: 'unrecognized', noWorkspaces: false, retrievalFailed: lines.some((line) => line.includes('Failed to retrieve upgrade status:')), unexpectedLineCount: 0 };
  if (headings.length !== 1) return details;
  const section = lines.slice(headings[0] + 1).filter(Boolean);
  const health = { 'Instance: Up to date': 'up-to-date', 'Instance: Behind': 'behind', 'Instance: Failed': 'failed' };
  details.instanceHealth = health[section[0]] ?? 'unrecognized';
  const counts = section[1]?.match(/^Workspaces: (\d+) up to date, (\d+) behind, (\d+) failed \((\d+) total\)$/);
  if (counts && counts.slice(1).every((count) => Number.isSafeInteger(Number(count)))) details.workspaceCounts = { upToDate: Number(counts[1]), behind: Number(counts[2]), failed: Number(counts[3]), total: Number(counts[4]) };
  details.noWorkspaces = section[1] === 'No workspaces';
  // Nest closes connections after printing the summary; only its info-level log framing may follow.
  details.unexpectedLineCount = section.slice(2).filter((line) => !/^\[Nest\]\s+\d+\s+-\s+\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}:\d{2}(?:\s+[AP]M)?\s+(?:LOG|DEBUG|VERBOSE)\s+\[[A-Za-z][A-Za-z0-9]*\]/.test(line)).length;
  return details;
}
export function assertUpgradeSummary(output) {
  const status = readUpgradeSummary(output);
  assert.equal(status.summaryCount, 1, 'Upgrade status must publish exactly one summary');
  assert.equal(status.instanceHealth, 'up-to-date', 'Instance must explicitly be up to date');
  const counts = status.workspaceCounts;
  assert.ok(status.noWorkspaces || (counts && counts.behind === 0 && counts.failed === 0 && counts.upToDate === counts.total), 'All workspaces must be explicitly up to date');
  assert.equal(status.unexpectedLineCount, 0, 'Unexpected status output must be investigated');
  assert.equal(status.retrievalFailed, false);
}
export function assertDatabaseState({ tableCount, markerPresent, complete }) {
  if (Number(tableCount) === 0) return false;
  assert.ok(markerPresent && complete === true, 'Existing or interrupted database requires a completed staging installation marker; manual recovery required');
  return true;
}
export const MIGRATION_COMMANDS = Object.freeze(['database-preflight', 'setup-db', 'run-instance-commands', 'cache:flush', 'upgrade', 'upgrade:status', 'cron:register:all']);
export const FAILURE_CATEGORIES = Object.freeze(['unknown', 'module-missing', 'configuration', 'database-connection', 'schema', 'resource-limit', 'cancelled', 'output-limit', 'upgrade-summary', 'cron-summary']);
const CONFIG_KEYS = ['APP_VERSION', 'PG_DATABASE_URL', 'REDIS_URL', 'APP_SECRET', 'ENCRYPTION_KEY', 'SERVER_URL', 'FRONTEND_URL', 'STORAGE_TYPE', 'STORAGE_LOCAL_PATH'];
export function commandDiagnostic(args, output, exitCode, reason) {
  const requested = args[0] === 'dist/database/scripts/setup-db.js' ? 'setup-db' : args[1];
  const command = MIGRATION_COMMANDS.includes(requested) ? requested : 'database-preflight';
  let category = reason ?? 'unknown';
  if (!reason) {
    if (/Cannot find module|MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED/.test(output)) category = 'module-missing';
    else if (/heap out of memory|ENOMEM|allocation failed/i.test(output) || exitCode === 137) category = 'resource-limit';
    else if (/ECONNREFUSED|ENOTFOUND|authentication failed|connect ETIMEDOUT/.test(output)) category = 'database-connection';
    else if (/configuration|environment variable|Config validation|must be a|is required/i.test(output)) category = 'configuration';
    else if (/QueryFailedError|relation .* does not exist|syntax error|migration.*failed|permission denied for schema/i.test(output)) category = 'schema';
  }
  const diagnostic = { action: 'migrate', command, category: FAILURE_CATEGORIES.includes(category) ? category : 'unknown' };
  if (Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255) diagnostic.exitCode = exitCode;
  if (command === 'upgrade:status') diagnostic.upgradeStatus = readUpgradeSummary(output);
  if (diagnostic.category === 'configuration') {
    const key = CONFIG_KEYS.find((candidate) => output.includes(candidate));
    if (key) diagnostic.configKey = key;
  }
  return diagnostic;
}
export const PREFLIGHT_STAGES = Object.freeze(['validate-environment', 'activation', 'import-pg', 'connect-database', 'statement-timeout', 'advisory-lock', 'table-count', 'marker-presence', 'marker-read', 'database-state', 'write-marker-table', 'write-marker-row', 'close-database']);
export const ERROR_NAMES = Object.freeze(['AssertionError', 'TypeError', 'Error', 'error', 'AggregateError', 'SyntaxError']);
export const ERROR_CODES = Object.freeze(['ERR_ASSERTION', 'ERR_INVALID_URL', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED', 'ENOENT', 'EACCES', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '28P01', '3D000', '42P01', '42501', '42703', '23505', '42P07', '40001', '57014', '57P03', '08006', '08001']);
export function preflightDiagnostic(stage, error) {
  const result = { action: 'migrate', command: 'database-preflight', category: stage === 'validate-environment' || stage === 'activation' ? 'configuration' : stage === 'connect-database' ? 'database-connection' : 'unknown' };
  if (PREFLIGHT_STAGES.includes(stage)) result.preflightStage = stage;
  if (ERROR_NAMES.includes(error?.name)) result.errorName = error.name;
  if (ERROR_CODES.includes(error?.code)) result.errorCode = error.code;
  if (VALIDATION_KEYS.includes(error?.stagingValidationKey)) result.validationKey = error.stagingValidationKey;
  if (stage === 'database-state' && error?.code === 'ERR_ASSERTION') result.reason = 'unowned-or-partial-database';
  return result;
}
async function runCommand(args, environment) {
  const checkCron = args[1] === 'cron:register:all';
  const checkUpgrade = args[1] === 'upgrade:status';
  const capture = args[0] !== 'dist/main.js' && args[0] !== 'dist/queue-worker/queue-worker.js';
  const child = spawn(process.execPath, args, { cwd: SERVER_DIRECTORY, env: environment, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  let output = '';
  let overflow = false;
  if (capture) for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => {
    output += data.toString();
    if (output.length > 512 * 1024) { output = ''; overflow = true; child.kill('SIGTERM'); }
  });
  let interrupted = false;
  const forward = (signal) => { interrupted = true; child.kill(signal); };
  const interrupt = () => forward('SIGINT');
  const terminate = () => forward('SIGTERM');
  process.once('SIGINT', interrupt); process.once('SIGTERM', terminate);
  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        try {
          assert.ok(code === 0 && !interrupted && !overflow, 'Staging command failed');
          if (checkCron) assertCronSummary(output);
          if (checkUpgrade) assertUpgradeSummary(output);
          resolve();
        } catch (error) {
          error.stagingDiagnostic = commandDiagnostic(args, output, code, interrupted ? 'cancelled' : overflow ? 'output-limit' : code === 0 ? (checkCron ? 'cron-summary' : checkUpgrade ? 'upgrade-summary' : undefined) : undefined);
          reject(error);
        }
      });
    });
  } finally { process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', terminate); }
}
export async function runCommands(commands, environment, execute = runCommand) {
  for (const args of commands) await execute(args, environment);
}
export async function main(environment, action) {
  if (action === 'health') {
    const result = await fetch('http://127.0.0.1:3000/healthz', { signal: AbortSignal.timeout(5000) });
    assert.ok(result.ok && (await result.json()).status === 'ok');
    return;
  }
  let client;
  let stage = 'validate-environment';
  let failed = false;
  try {
    validateEnvironment(environment);
    if (action === 'migrate') {
      stage = 'activation';
      validate('KOVAALABCRM_ALLOW_STAGING_MIGRATIONS', () => assert.equal(environment.KOVAALABCRM_ALLOW_STAGING_MIGRATIONS, 'true', 'Explicit staging migration opt-in required'));
      stage = 'import-pg';
      const { Client } = createRequire(`${SERVER_DIRECTORY}/package.json`)('pg');
      client = new Client({ connectionString: environment.PG_DATABASE_URL });
      stage = 'connect-database';
      await client.connect();
      stage = 'statement-timeout';
      await client.query("SET statement_timeout = '600000'");
      stage = 'advisory-lock';
      await client.query("SELECT pg_advisory_lock(hashtext('kovaalabcrm-staging-migrate'))");
      stage = 'table-count';
      const tables = await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'");
      stage = 'marker-presence';
      const marker = await client.query("SELECT to_regclass('public.kovaalabcrm_staging_installation') IS NOT NULL AS present");
      stage = 'marker-read';
      const state = marker.rows[0].present ? await client.query('SELECT complete FROM public.kovaalabcrm_staging_installation WHERE singleton = true') : { rows: [] };
      stage = 'database-state';
      const initialized = assertDatabaseState({ tableCount: tables.rows[0].count, markerPresent: marker.rows[0].present, complete: state.rows[0]?.complete });
      await runCommands(actionCommands(action, initialized), environment);
      if (!initialized) {
        stage = 'write-marker-table';
        await client.query('CREATE TABLE public.kovaalabcrm_staging_installation (singleton boolean PRIMARY KEY CHECK (singleton), complete boolean NOT NULL, source_sha text NOT NULL)');
        stage = 'write-marker-row';
        await client.query('INSERT INTO public.kovaalabcrm_staging_installation VALUES (true, true, $1)', [environment.KOVAALABCRM_STAGING_SOURCE_SHA]);
      }
    } else {
      await runCommands(actionCommands(action, false), environment);
    }
  } catch (error) {
    failed = true;
    if (action === 'migrate' && !error.stagingDiagnostic) error.stagingDiagnostic = preflightDiagnostic(stage, error);
    throw error;
  } finally {
    if (client) try { await client.end(); } catch (error) {
      if (!failed) { error.stagingDiagnostic = preflightDiagnostic('close-database', error); throw error; }
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.env, process.argv[2]).catch((error) => {
    if (process.argv[2] === 'migrate') console.error('KOVAALABCRM_MIGRATION_FAILURE ' + JSON.stringify(error.stagingDiagnostic ?? commandDiagnostic([], ['ECONNREFUSED', 'ENOTFOUND', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code) ? error.code : '', undefined)));
    console.error('kovaalabcrm staging refused startup or a strict command failed; private configuration withheld'); process.exitCode = 1;
  });
}
