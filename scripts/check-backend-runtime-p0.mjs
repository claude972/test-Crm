import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Only run against disposable GitHub Actions services');
const database = new URL(process.env.PG_DATABASE_URL);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.port, '5432');
const redis = new URL(process.env.REDIS_URL);
assert.equal(redis.hostname, '127.0.0.1');
assert.equal(redis.port, '6379');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cwd = path.join(root, 'apps/crm/ui/packages/twenty-server');
assert.equal(existsSync(path.join(cwd, '.env')), false, 'Do not load a private environment file');
const appSecret = randomBytes(32).toString('hex');
const env = {
  ...process.env,
  NODE_ENV: 'production',
  NODE_HOST: '127.0.0.1',
  NODE_PORT: '3000',
  SERVER_URL: 'http://127.0.0.1:3000',
  FRONTEND_URL: 'http://127.0.0.1:3001',
  APP_SECRET: appSecret,
  REDIS_CACHE_PREFIX: `p0-ci-${process.env.GITHUB_RUN_ID}`,
  TELEMETRY_ENABLED: 'false',
  IS_BILLING_ENABLED: 'false',
  IS_FDW_ENABLED: 'false',
  EMAIL_DRIVER: 'logger',
};
const redact = (text) => String(text).replaceAll(appSecret, '[redacted]').replaceAll(database.password, '[redacted]');
const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...env, IS_CONFIG_VARIABLES_IN_DB_ENABLED: 'false' },
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(redact(`${args[0]} failed: ${result.error ?? result.status}\n${result.stdout}\n${result.stderr}`).slice(-18_000));
  }
};
run(['dist/database/scripts/setup-db.js']);
run(['dist/command/command.js', 'run-instance-commands', '--force', '--include-slow']);

const server = spawn(process.execPath, ['dist/main.js'], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (data) => { log = (log + data).slice(-30_000); });
}
let spawnError;
server.on('error', (error) => { spawnError = error; });
try {
  let ready = false;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (spawnError || server.exitCode !== null) {
      throw new Error(redact(`Server exited before readiness: ${spawnError ?? server.exitCode}\n${log}`));
    }
    try {
      const health = await fetch('http://127.0.0.1:3000/healthz', { signal: AbortSignal.timeout(2000) });
      if (health.ok) {
        const body = await health.json();
        assert.equal(body.status, 'ok');
        ready = true;
        break;
      }
    } catch { /* Startup may still be in progress. */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, redact(`Readiness timed out\n${log}`));
  const response = await fetch('http://127.0.0.1:3000/client-config?v=p0-ci', { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, 'Client configuration endpoint must respond');
  const config = await response.json();
  assert.equal(typeof config.allowRequestsToKovaaLabCRMIcons, 'boolean');
  assert.equal(Object.hasOwn(config, 'allowRequestsToTwentyIcons'), false);
  console.info('P0 runtime: disposable database initialized, server healthy, client-config contract verified');
} finally {
  server.kill('SIGTERM');
  const killTimer = setTimeout(() => server.kill('SIGKILL'), 5000);
  killTimer.unref();
}
