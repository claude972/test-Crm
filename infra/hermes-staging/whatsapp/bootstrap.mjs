import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export function validateProviderEnvironment(environment) {
  assert.equal(environment.DATABASE_PROVIDER, 'postgresql');
  const database = new URL(environment.DATABASE_CONNECTION_URI);
  assert.equal(database.hostname, 'wa-db'); assert.equal(database.pathname, '/kovaalabcrm_wa'); assert.equal(database.username, 'kovaalabcrm_wa'); assert.equal(database.search, ''); assert.match(database.password, /^[a-f0-9]{64}$/);
  const redis = new URL(environment.CACHE_REDIS_URI);
  assert.equal(redis.hostname, 'wa-redis'); assert.equal(redis.pathname, '/0'); assert.match(redis.password, /^[a-f0-9]{64}$/);
  assert.match(environment.AUTHENTICATION_API_KEY ?? '', /^[a-f0-9]{64}$/);
  assert.equal(environment.AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES, 'false');
  assert.equal(environment.SERVER_TYPE, 'http'); assert.equal(environment.SERVER_PORT, '8080');
  assert.match(environment.SERVER_URL ?? '', /^https:\/\/evolution-kovaalabcrm-[a-z0-9-]+\.test:8443$/);
  assert.equal(environment.WEBHOOK_GLOBAL_ENABLED, 'false');
}
export async function runQuiet(command, args, environment, phase, spawnChild = spawn) {
  await new Promise((resolve, reject) => {
    const child = spawnChild(command, args, { cwd: '/evolution', env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    // Native scripts can print DATABASE_URL and QR/pairing tokens: never inherit their streams.
    child.stdout.on('data', () => {}); child.stderr.on('data', () => {});
    let cancelled = false;
    const stop = () => { cancelled = true; child.kill('SIGTERM'); };
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
    let settled = false;
    const done = (error) => { if (settled) return; settled = true; process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); error ? reject(Object.assign(new Error('WA native command failed'), { phase })) : resolve(); };
    child.once('error', () => done(true)); child.once('exit', (code, signal) => done(code !== 0 || signal || cancelled));
  });
}
function phase(value, failed = false) { writeFileSync('/tmp/kovaalabcrm-wa-bootstrap.json', JSON.stringify({ phase: value, failed }), { mode: 0o600 }); }
export async function bootstrap(environment) {
  phase('validation');
  validateProviderEnvironment(environment);
  const values = { ...environment, DATABASE_URL: environment.DATABASE_CONNECTION_URI };
  phase('migration');
  await runQuiet('npm', ['run', 'db:deploy'], values, 'migration');
  phase('client-generation');
  await runQuiet('npm', ['run', 'db:generate'], values, 'client-generation');
  console.info('WA strict migration/client generation completed; association not established');
  phase('runtime');
  await runQuiet(process.execPath, ['dist/main'], values, 'runtime');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) bootstrap(process.env).catch((error) => { phase(['migration', 'client-generation', 'runtime'].includes(error?.phase) ? error.phase : 'validation', true); console.error('KOVAALABCRM_WA_STARTUP_FAILURE ' + JSON.stringify({ phase: ['migration', 'client-generation', 'runtime'].includes(error?.phase) ? error.phase : 'validation' })); process.exitCode = 1; });
