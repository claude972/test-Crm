import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Only run against disposable GitHub Actions services');
const database = new URL(process.env.PG_DATABASE_URL);
assert.ok(['postgres:', 'postgresql:'].includes(database.protocol), 'PostgreSQL URL required');
assert.equal(database.hostname, '127.0.0.1', 'Database must use loopback');
assert.equal(database.port, '5432', 'Database must use port 5432');
assert.equal(database.pathname, '/p0_ci', 'Only disposable p0_ci is allowed');
assert.equal(database.search, '', 'Database connection overrides are forbidden');
const redis = new URL(process.env.REDIS_URL);
assert.equal(redis.protocol, 'redis:');
assert.equal(redis.hostname, '127.0.0.1', 'Redis must use loopback');
assert.equal(redis.port, '6379');
assert.ok(['', '/0'].includes(redis.pathname), 'Only disposable Redis database 0 is allowed');
assert.equal(redis.search, '', 'Redis connection overrides are forbidden');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.join(root, 'apps/crm/ui');
const cwd = path.join(workspace, 'packages/twenty-server');
for (const directory of [root, workspace, cwd]) {
  assert.equal(existsSync(path.join(directory, '.env')), false, 'Do not load a private environment file');
}
assert.ok(path.isAbsolute(process.env.P0_PREVIEW_CONTROL_FILE ?? ''), 'P0_PREVIEW_CONTROL_FILE must be absolute');
const controlFile = process.env.P0_PREVIEW_CONTROL_FILE;
const maxMinutes = Number(process.env.P0_PREVIEW_MAX_MINUTES ?? 60);
assert.ok(Number.isFinite(maxMinutes) && maxMinutes > 0 && maxMinutes <= 90, 'Duration must be >0 and <=90 minutes');
assert.ok([undefined, 'true', 'false'].includes(process.env.P0_PREVIEW_START_WORKER), 'Worker option must be true or false');
const withWorker = process.env.P0_PREVIEW_START_WORKER === 'true';
const startedAt = Date.now();
const expiry = process.env.P0_PREVIEW_EXPIRES_AT;
if (expiry !== undefined) assert.match(expiry, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/, 'Expiry must be an absolute UTC ISO timestamp');
const deadline = expiry === undefined ? startedAt + maxMinutes * 60_000 : Date.parse(expiry);
assert.ok(Number.isFinite(deadline) && deadline > startedAt && deadline <= startedAt + 90 * 60_000, 'Expiry must be in the future and at most 90 minutes away');
let stopped = false;
let receivedSignal;
const children = new Set();
const appSecret = randomBytes(32).toString('hex');
console.info(`::add-mask::${appSecret}`);
const secrets = [appSecret, database.password, redis.password]
  .flatMap((secret) => [secret, decodeURIComponent(secret)]).filter(Boolean);
const redact = (value) => secrets.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), String(value));
const env = {
  ...process.env,
  NODE_ENV: 'production', NODE_HOST: '127.0.0.1', NODE_PORT: '3000',
  APP_SECRET: appSecret,
  REDIS_CACHE_PREFIX: `p0-preview-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`,
  IS_CONFIG_VARIABLES_IN_DB_ENABLED: 'false',
  TRUST_PROXY: 'loopback', AUTH_COOKIE_SAME_SITE: 'lax',
  TELEMETRY_ENABLED: 'false', IS_BILLING_ENABLED: 'false', IS_FDW_ENABLED: 'false', EMAIL_DRIVER: 'logger',
  // Preview campaigns must fail closed until a real relay is explicitly configured.
  EMAILING_DOMAIN_DRIVER: 'SMTP', EMAILING_SMTP_CONNECTIONS: '{}',
};
const delay = () => new Promise((resolve) => setTimeout(resolve, 1000));
const active = () => !stopped && Date.now() < deadline;
function signalChild(child, signal) {
  // Descendants can outlive the detached group leader.
  if (!child.pid) return;
  try { process.kill(-child.pid, signal); } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    receivedSignal = signal;
    stopped = true;
    for (const child of children) signalChild(child, 'SIGTERM');
  });
}
function launch(entry, extraArgs = []) {
  const child = spawn(process.execPath, [entry, ...extraArgs], {
    cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  child.log = '';
  child.on('error', (error) => { child.spawnError = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (data) => { child.log = (child.log + redact(data)).slice(-20_000); });
  }
  return child;
}
function assertRunning(child) {
  assert.ok(!child.spawnError && child.exitCode === null && child.signalCode === null,
    redact(`Process stopped: ${child.spawnError ?? child.exitCode ?? child.signalCode}\n${child.log}`));
}
async function terminate(child) {
  signalChild(child, 'SIGTERM');
  const expires = Date.now() + 5000;
  while (child.exitCode === null && child.signalCode === null && !child.spawnError && Date.now() < expires) await delay();
  signalChild(child, 'SIGKILL');
  children.delete(child);
}
async function command(entry, args = []) {
  const child = launch(entry, args);
  const expires = Math.min(Date.now() + 300_000, deadline);
  while (active() && Date.now() < expires && !child.spawnError && child.exitCode === null && child.signalCode === null) await delay();
  try {
    assert.ok(active(), 'Preview stopped before database initialization completed');
    assert.ok(!child.spawnError && child.exitCode === 0, redact(`Initialization failed or timed out: ${entry}\n${child.log}`));
  } finally { await terminate(child); }
}
function publicOrigin(value) {
  assert.equal(typeof value, 'string', 'Public URL must be a string');
  const url = new URL(value);
  assert.equal(url.protocol, 'https:', 'Public URLs must use HTTPS');
  assert.ok(url.hostname.endsWith('.vercel.app'), 'An isolated Vercel preview hostname is required');
  assert.equal(url.port, '', 'Public URLs cannot contain a port');
  assert.equal(url.username + url.password + url.search + url.hash, '', 'Public URLs cannot contain credentials, query or fragment');
  assert.equal(url.pathname, '/', 'Public URLs must be origins');
  return url.origin;
}
function readControl() {
  const content = readFileSync(controlFile, 'utf8');
  assert.ok(Buffer.byteLength(content) <= 4096, 'Control JSON is too large');
  const value = JSON.parse(content);
  assert.ok(value && !Array.isArray(value) && typeof value === 'object', 'Control must be an object');
  assert.deepEqual(Object.keys(value).sort(), ['frontendUrl', 'serverUrl'], 'Control accepts public URLs only');
  const serverUrl = publicOrigin(value.serverUrl);
  const frontendUrl = publicOrigin(value.frontendUrl);
  assert.equal(serverUrl, frontendUrl, 'Server and frontend must share the same public origin');
  return { serverUrl, frontendUrl };
}
async function readiness(server, worker) {
  const expires = Math.min(Date.now() + 120_000, deadline);
  while (active() && Date.now() < expires) {
    assertRunning(server);
    if (worker) assertRunning(worker);
    try {
      const health = await fetch('http://127.0.0.1:3000/healthz', { signal: AbortSignal.timeout(2000) });
      if (health.ok && (await health.json()).status === 'ok') {
        const response = await fetch('http://127.0.0.1:3000/client-config?v=p0-preview', { signal: AbortSignal.timeout(5000) });
        assert.equal(response.status, 200);
        const config = await response.json();
        assert.equal(typeof config.allowRequestsToKovaaLabCRMIcons, 'boolean');
        assert.equal(Object.hasOwn(config, 'allowRequestsToTwentyIcons'), false);
        return;
      }
    } catch { /* Retry while Nest starts and its dependencies connect. */ }
    await delay();
  }
  throw new Error(redact(`Readiness or client-config verification timed out\n${server.log}`));
}

try {
  console.info('P0 preview: waiting up to 15 minutes for public control URLs');
  const controlDeadline = Math.min(Date.now() + 15 * 60_000, deadline);
  while (active() && !existsSync(controlFile) && Date.now() < controlDeadline) await delay();
  assert.ok(active() && existsSync(controlFile), 'Public control URLs were not received in time');
  let control = readControl();
  env.SERVER_URL = control.serverUrl;
  env.FRONTEND_URL = control.frontendUrl;
  env.AUTH_COOKIE_ALLOWED_ORIGINS = control.frontendUrl;
  await command('dist/database/scripts/setup-db.js');
  await command('dist/command/command.js', ['run-instance-commands', '--force', '--include-slow']);
  let server;
  let worker;
  let lastInvalidControl;
  while (active()) {
    if (!server) {
      env.SERVER_URL = control.serverUrl;
      env.FRONTEND_URL = control.frontendUrl;
      env.AUTH_COOKIE_ALLOWED_ORIGINS = control.frontendUrl;
      server = launch('dist/main.js');
      if (withWorker) worker = launch('dist/queue-worker/queue-worker.js');
      await readiness(server, worker);
      console.info(`P0 preview ready: healthz and client-config verified; worker=${withWorker}; expires=${new Date(deadline).toISOString()}`);
    }
    assertRunning(server);
    if (worker) assertRunning(worker);
    let updated;
    try { updated = readControl(); lastInvalidControl = undefined; } catch (error) {
      const message = redact(error.message);
      if (message !== lastInvalidControl) console.warn(`P0 preview: ignoring invalid control update: ${message}`);
      lastInvalidControl = message;
    }
    if (updated && JSON.stringify(updated) !== JSON.stringify(control)) {
      console.info('P0 preview: public URLs changed; restarting processes without database initialization');
      if (worker) await terminate(worker);
      await terminate(server);
      server = undefined;
      worker = undefined;
      control = updated;
    }
    await delay();
  }
  console.info(`P0 preview session ended: ${receivedSignal ?? 'time limit'}`);
} catch (error) {
  if (!receivedSignal) {
    console.error(redact(error.stack ?? error));
    process.exitCode = 1;
  }
} finally {
  stopped = true;
  await Promise.all([...children].map(terminate));
}
