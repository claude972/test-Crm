import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const POSTGRES_IMAGE = 'postgres:16-bookworm@sha256:e8a07d2c7579b038938cdba6c539e580e5001caf9ea203d397b5cc83e76bd938';
const REDIS_IMAGE = 'redis:7-bookworm@sha256:b6b6e3dc0c0952737748e55d5d885272840c7e42ba41ab1d5489f693419882f5';
export const CLIENT_SDK_ENTRYPOINTS = Object.freeze(['core', 'metadata', 'rest', 'generate']);
export function validateSmokeEnvironment(environment) {
  assert.equal(environment.GITHUB_ACTIONS, 'true', 'Image smoke is restricted to disposable GitHub Actions runners');
  assert.equal(environment.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.match(environment.HERMES_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.ok(path.isAbsolute(environment.RUNNER_TEMP ?? ''));
  assert.match(environment.HERMES_STAGING_IMAGE ?? '', /^(?:kovaalabcrm-staging:[a-f0-9]{40}|sha256:[a-f0-9]{64})$/, 'Only a local staging SHA reference or image ID is accepted');
  if (environment.HERMES_STAGING_REPORT_FILE) {
    const file = path.resolve(environment.HERMES_STAGING_REPORT_FILE);
    const temporary = realpathSync(environment.RUNNER_TEMP);
    const parent = realpathSync(path.dirname(file));
    assert.ok(parent === temporary || parent.startsWith(`${temporary}${path.sep}`));
    assert.equal(existsSync(file), false, 'Never replace an existing report or private file');
  }
}
export async function smoke(environment) {
  validateSmokeEnvironment(environment);
  const directory = mkdtempSync(path.join(realpathSync(environment.RUNNER_TEMP), 'kovaalabcrm-staging-private-'));
  const prefix = `kovaalabcrm-staging-smoke-${randomBytes(6).toString('hex')}`;
  const containers = [];
  const networks = [];
  const volumes = [];
  const secrets = Array.from({ length: 4 }, () => randomBytes(32).toString('hex'));
  for (const secret of secrets) console.info(`::add-mask::${secret}`);
  const [databasePassword, redisPassword, appSecret, encryptionKey] = secrets;
  const checks = {};
  let phase = 'image';
  let failure;
  let imageId;
  const report = { product: 'kovaalabcrm-staging', sourceSha: environment.HERMES_SOURCE_SHA, checks };
  const docker = (args, timeout = 60_000) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 8 * 1024 * 1024 }).toString().trim();
  const privateEnv = (name, values) => {
    const file = path.join(directory, name);
    writeFileSync(file, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''), { flag: 'wx', mode: 0o600 });
    return file;
  };
  const objectExists = (kind, name) => spawnSync('docker', [kind, 'inspect', name], { stdio: 'ignore', timeout: 10_000 }).status === 0;
  const wait = async (probe, timeout = 180_000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try { if (await probe()) return; } catch { /* bounded readiness, no private output */ }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Staging readiness timed out');
  };
  const running = (name) => docker(['inspect', '--format', '{{.State.Status}}', name]) === 'running';
  try {
    const inspected = JSON.parse(docker(['image', 'inspect', environment.HERMES_STAGING_IMAGE]))[0];
    imageId = inspected.Id;
    assert.equal(inspected.Config.Labels['org.opencontainers.image.revision'], environment.HERMES_SOURCE_SHA);
    assert.equal(inspected.Config.User, '1000:1000');
    assert.equal(inspected.Architecture, 'amd64');
    report.imageId = imageId;
    checks.exactImage = true;
    phase = 'image-runtime-files';
    const filesProbe = `const fs=require('node:fs');for(const p of ['dist/main.js','dist/queue-worker/queue-worker.js','dist/front/index.html','dist/assets/kovaa-lab-client-sdk/dist/metadata/index.d.ts']){if(!fs.statSync(p).size)process.exit(1)}if(fs.readFileSync('dist/front/KOVAALABCRM_SOURCE.txt','utf8').trim()!==process.env.KOVAALABCRM_STAGING_SOURCE_SHA)process.exit(1);`;
    docker(['run', '--rm', '--network', 'none', '--entrypoint', 'node', imageId, '-e', filesProbe]);
    phase = 'image-shared-entrypoint';
    docker(['run', '--rm', '--network', 'none', '--entrypoint', 'node', imageId, '-e', "require.resolve('kovaa-lab-shared');"]);
    for (const entrypoint of CLIENT_SDK_ENTRYPOINTS) {
      phase = `image-client-sdk-${entrypoint}`;
      docker(['run', '--rm', '--network', 'none', '--entrypoint', 'node', imageId, '-e', `require.resolve('kovaa-lab-client-sdk/${entrypoint}');`]);
    }
    checks.frontendServerSdk = true;
    phase = 'services';
    const dataNetwork = `${prefix}-data`; const edgeNetwork = `${prefix}-edge`;
    for (const [name, internal] of [[dataNetwork, true], [edgeNetwork, false]]) {
      networks.push(name); docker(['network', 'create', ...(internal ? ['--internal'] : []), name]);
    }
    const storage = `${prefix}-storage`; const postgresVolume = `${prefix}-postgres`; const redisVolume = `${prefix}-redis`;
    for (const volume of [storage, postgresVolume, redisVolume]) { volumes.push(volume); docker(['volume', 'create', volume]); }
    const database = `${prefix}-db`; const redis = `${prefix}-redis`; const server = `${prefix}-server`; const worker = `${prefix}-worker`;
    const postgresEnv = privateEnv('postgres.env', { POSTGRES_DB: 'kovaalabcrm_staging', POSTGRES_USER: 'kovaalabcrm', POSTGRES_PASSWORD: databasePassword });
    const redisEnv = privateEnv('redis.env', { REDIS_PASSWORD: redisPassword });
    containers.push(database);
    docker(['run', '--detach', '--name', database, '--network', dataNetwork, '--network-alias', 'db', '--memory', '1g', '--cpus', '1', '--env-file', postgresEnv, '--mount', `type=volume,src=${postgresVolume},dst=/var/lib/postgresql/data`, POSTGRES_IMAGE]);
    containers.push(redis);
    docker(['run', '--detach', '--name', redis, '--network', dataNetwork, '--network-alias', 'redis', '--memory', '256m', '--cpus', '0.5', '--env-file', redisEnv, '--mount', `type=volume,src=${redisVolume},dst=/data`, '--entrypoint', '/bin/sh', REDIS_IMAGE, '-ec', 'exec /usr/local/bin/docker-entrypoint.sh redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes --maxmemory 192mb --maxmemory-policy noeviction']);
    await wait(() => docker(['exec', database, 'pg_isready', '-U', 'kovaalabcrm', '-d', 'kovaalabcrm_staging']).includes('accepting connections'));
    const redisCommand = (args) => docker(['exec', redis, '/bin/sh', '-ec', `REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ${args}`]);
    await wait(() => redisCommand('ping') === 'PONG');
    const listener = net.createServer();
    await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
    const selectedPort = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const smokeOrigin = `http://127.0.0.1:${selectedPort}`;
    const values = {
      PG_DATABASE_URL: `postgres://kovaalabcrm:${databasePassword}@db:5432/kovaalabcrm_staging`, REDIS_URL: `redis://:${redisPassword}@redis:6379/0`,
      APP_SECRET: appSecret, ENCRYPTION_KEY: encryptionKey, SERVER_URL: smokeOrigin, FRONTEND_URL: smokeOrigin, AUTH_COOKIE_ALLOWED_ORIGINS: smokeOrigin,
      GITHUB_ACTIONS: 'true', KOVAALABCRM_STAGING_SMOKE: 'true', KOVAALABCRM_ALLOW_STAGING_MIGRATIONS: 'true',
      NODE_OPTIONS: '--max-old-space-size=1536', IS_CONFIG_VARIABLES_IN_DB_ENABLED: 'false', IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: 'true', IS_MULTIWORKSPACE_ENABLED: 'false',
      DEFAULT_LOCALE: 'fr-FR', HERMES_B2B_CAMPAIGNS_ENABLED: 'true', EMAIL_DRIVER: 'logger', EMAILING_DOMAIN_DRIVER: 'SMTP', EMAILING_SMTP_CONNECTIONS: '{}',
      TELEMETRY_ENABLED: 'false', IS_BILLING_ENABLED: 'false', IS_FDW_ENABLED: 'false', REDIS_QUEUE_PREFIX: 'kovaalabcrm-staging', REDIS_CACHE_PREFIX: 'kovaalabcrm-staging',
      SIGN_IN_PREFILLED: 'false', OUTBOUND_HTTP_SAFE_MODE_ENABLED: 'true', IMAP_SMTP_ALLOW_SELF_SIGNED: 'false', OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS: '[]',
    };
    const runtimeEnv = privateEnv('runtime.env', values);
    phase = 'migrate';
    const migration = `${prefix}-migrate`; containers.push(migration);
    docker(['run', '--name', migration, '--no-healthcheck', '--network', dataNetwork, '--env-file', runtimeEnv, '--memory', '2g', '--cpus', '2', '--mount', `type=volume,src=${storage},dst=/app/packages/twenty-server/.local-storage`, imageId, 'migrate'], 900_000);
    checks.strictMigration = true;
    phase = 'server';
    containers.push(server);
    docker(['create', '--name', server, '--network', edgeNetwork, '--publish', `127.0.0.1:${selectedPort}:3000`, '--env-file', runtimeEnv,
      '--memory', '2g', '--cpus', '1', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,nosuid,size=512m',
      '--mount', `type=volume,src=${storage},dst=/app/packages/twenty-server/.local-storage`, imageId, 'server']);
    docker(['network', 'connect', dataNetwork, server]); docker(['start', server]);
    const port = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', server]);
    assert.match(port, /^\d+$/); const origin = `http://127.0.0.1:${port}`;
    const health = async () => {
      if (!running(server)) return false;
      const response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(5000) });
      return response.ok && (await response.json()).status === 'ok';
    };
    await wait(health);
    const config = await (await fetch(`${origin}/client-config`, { signal: AbortSignal.timeout(5000) })).json();
    assert.equal(config.isSameOriginMultiWorkspaceEnabled, true);
    assert.equal(config.isMultiWorkspaceEnabled, false);
    const frontend = await fetch(`${origin}/dashboard`, { headers: { Accept: 'text/html', 'Sec-Fetch-Dest': 'document' }, signal: AbortSignal.timeout(5000) });
    assert.equal(frontend.status, 200); assert.match(await frontend.text(), /<\/head>/);
    const marker = await fetch(`${origin}/KOVAALABCRM_SOURCE.txt`, { signal: AbortSignal.timeout(5000) });
    assert.equal((await marker.text()).trim(), environment.HERMES_SOURCE_SHA);
    checks.healthClientConfigFrontend = true;
    phase = 'worker'; containers.push(worker);
    docker(['create', '--name', worker, '--no-healthcheck', '--network', edgeNetwork, '--env-file', runtimeEnv, '--env', 'NODE_OPTIONS=--max-old-space-size=1024', '--memory', '1536m', '--cpus', '1',
      '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,nosuid,size=512m', '--mount', `type=volume,src=${storage},dst=/app/packages/twenty-server/.local-storage`, imageId, 'worker']);
    docker(['network', 'connect', dataNetwork, worker]); docker(['start', worker]);
    const workerProbe = `const {Queue}=require('bullmq');const u=new URL(process.env.REDIS_URL);const q=new Queue('campaign-send-queue',{prefix:process.env.REDIS_QUEUE_PREFIX,connection:{host:u.hostname,port:Number(u.port),password:decodeURIComponent(u.password)}});q.getWorkers().then(async w=>{await q.close();process.exit(w.length?0:1)}).catch(()=>process.exit(1));`;
    await wait(() => running(worker) && (docker(['exec', worker, 'node', '-e', workerProbe]), true));
    checks.registeredQueueWorker = true;
    phase = 'persistence';
    const sql = (statement) => docker(['exec', database, 'psql', '-U', 'kovaalabcrm', '-d', 'kovaalabcrm_staging', '-v', 'ON_ERROR_STOP=1', '-Atc', statement]);
    sql('CREATE TABLE public.kovaalabcrm_packaging_probe (id integer PRIMARY KEY); INSERT INTO public.kovaalabcrm_packaging_probe VALUES (1)');
    assert.equal(redisCommand('SET kovaalabcrm-packaging-probe retained'), 'OK');
    const storageProbe = `const fs=require('node:fs');const p='.local-storage/.packaging-probe';fs.writeFileSync(p,'retained');`;
    docker(['exec', server, 'node', '-e', storageProbe]);
    docker(['stop', '--time', '20', worker, server], 60_000); docker(['restart', database, redis]);
    await wait(() => docker(['exec', database, 'pg_isready', '-U', 'kovaalabcrm']).includes('accepting connections'));
    await wait(() => redisCommand('ping') === 'PONG');
    assert.equal(sql('SELECT id FROM public.kovaalabcrm_packaging_probe'), '1');
    assert.equal(redisCommand('GET kovaalabcrm-packaging-probe'), 'retained');
    phase = 'existing-volume-migrate';
    const repeatMigration = `${prefix}-migrate-repeat`; containers.push(repeatMigration);
    docker(['run', '--name', repeatMigration, '--no-healthcheck', '--network', dataNetwork, '--env-file', runtimeEnv, '--memory', '2g', '--cpus', '2', '--mount', `type=volume,src=${storage},dst=/app/packages/twenty-server/.local-storage`, imageId, 'migrate'], 900_000);
    assert.equal(sql('SELECT id FROM public.kovaalabcrm_packaging_probe'), '1');
    checks.sameVersionExistingVolumeMigration = true;
    phase = 'restart';
    docker(['start', server]); await wait(health); docker(['start', worker]);
    await wait(() => running(worker) && (docker(['exec', worker, 'node', '-e', workerProbe]), true));
    docker(['exec', server, 'node', '-e', "if(require('node:fs').readFileSync('.local-storage/.packaging-probe','utf8')!=='retained')process.exit(1)"]);
    checks.restartPersistence = true;
    phase = 'completed';
  } catch (error) {
    report.failurePhase = phase;
    if (Number.isInteger(error.status)) report.commandExitCode = error.status;
    failure = `Staging image smoke failed during ${phase}; private diagnostics withheld`;
  }
  finally {
    let clean = true;
    try { docker(['info', '--format', '{{.ID}}']); } catch { clean = false; }
    for (const name of [...containers].reverse()) { try { if (objectExists('container', name)) docker(['rm', '--force', name]); } catch { clean = false; } }
    for (const name of [...networks].reverse()) { try { if (objectExists('network', name)) docker(['network', 'rm', name]); } catch { clean = false; } }
    for (const name of [...volumes].reverse()) { try { if (objectExists('volume', name)) docker(['volume', 'rm', name]); } catch { clean = false; } }
    rmSync(directory, { recursive: true, force: true });
    checks.cleanup = clean && !existsSync(directory) && !containers.some((name) => objectExists('container', name)) && !networks.some((name) => objectExists('network', name)) && !volumes.some((name) => objectExists('volume', name));
    if (!checks.cleanup) failure ??= 'Staging smoke cleanup was incomplete';
    report.success = failure === undefined;
    if (environment.HERMES_STAGING_REPORT_FILE) writeFileSync(environment.HERMES_STAGING_REPORT_FILE, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  }
  if (failure) throw new Error(failure);
  console.info('kovaalabcrm image smoke: exact source, strict migration, frontend, registered worker and restart persistence verified; disposable resources removed');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  smoke(process.env).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
