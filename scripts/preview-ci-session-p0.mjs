import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable GitHub Actions runners only');
assert.ok(process.env.RUNNER_TEMP && path.isAbsolute(process.env.RUNNER_TEMP));
const directory = path.resolve(process.env.RUNNER_TEMP, 'p0-preview-session');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateFile = path.join(directory, 'processes.json');
const controlFile = path.join(directory, 'control.json');
const artifactFile = path.join(directory, 'public', 'tunnel.json');
const delay = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
const apiUrl = () => {
  assert.match(process.env.GITHUB_REPOSITORY ?? '', /^[\w.-]+\/[\w.-]+$/);
  return `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/docs/verification/p0-preview-control.json?ref=missions%2Fp0-stabilization`;
};
async function remoteControl() {
  assert.ok(process.env.GITHUB_TOKEN, 'A contents:read token is required');
  const response = await fetch(apiUrl(), {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  assert.equal(response.status, 200, `Control transport returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(body.type, 'file');
  assert.equal(body.encoding, 'base64');
  assert.match(body.sha, /^[a-f0-9]{40}$/);
  assert.ok(body.size <= 4096, 'Public control is too large');
  return { sha: body.sha, content: Buffer.from(body.content, 'base64').toString('utf8') };
}
function validateControl(content) {
  const value = JSON.parse(content);
  assert.ok(value && !Array.isArray(value) && typeof value === 'object');
  assert.deepEqual(Object.keys(value).sort(), ['frontendUrl', 'serverUrl']);
  for (const key of ['serverUrl', 'frontendUrl']) {
    const url = new URL(value[key]);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname.endsWith('.vercel.app'));
    assert.ok(!url.port && !url.username && !url.password && !url.search && !url.hash);
    assert.equal(url.pathname, '/');
    value[key] = url.origin;
  }
  assert.equal(value.serverUrl, value.frontendUrl);
  return JSON.stringify(value);
}
async function loadState() { return JSON.parse(await readFile(stateFile, 'utf8')); }
async function saveState(state) {
  const temporary = `${stateFile}.next`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, stateFile);
}
function killGroup(pid, signal) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return;
  try { process.kill(-pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function background(command, args, env, logFile) {
  const descriptor = openSync(logFile, 'a', 0o600);
  try {
    const child = spawn(command, args, { cwd: root, env, detached: true, stdio: ['ignore', descriptor, descriptor] });
    return new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('spawn', () => { child.unref(); resolve(child.pid); });
    });
  } finally { closeSync(descriptor); }
}
async function cleanup() {
  let state;
  try { state = await loadState(); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const pid of state.pids) killGroup(pid, 'SIGTERM');
  await delay(6000);
  for (const pid of state.pids) killGroup(pid, 'SIGKILL');
  await rm(controlFile, { force: true });
  await rm(path.join(directory, 'control.next.json'), { force: true });
  await rm(stateFile, { force: true });
}
async function start() {
  assert.match(process.env.P0_ORIGIN_SECRET ?? '', /^[a-f0-9]{64}$/, 'Origin secret must be 32-byte hex');
  assert.ok(process.env.GITHUB_ENV, 'GitHub environment output is required');
  const initial = await remoteControl();
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await mkdir(path.dirname(artifactFile), { mode: 0o700 });
  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const state = { pids: [], expiresAt, baselineSha: initial?.sha ?? null };
  await saveState(state);
  const publicEnv = { PATH: process.env.PATH, P0_PREVIEW_CONTROL_FILE: controlFile, P0_PREVIEW_EXPIRES_AT: expiresAt };
  try {
    state.pids.push(await background(process.execPath, ['scripts/preview-origin-gate.mjs'], {
      ...publicEnv, P0_ORIGIN_SECRET: process.env.P0_ORIGIN_SECRET,
    }, path.join(directory, 'gate.log')));
    await saveState(state);
    state.pids.push(await background(path.join(process.env.RUNNER_TEMP, 'cloudflared'), [
      'tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:3002', '--protocol', 'http2',
    ], { PATH: process.env.PATH }, path.join(directory, 'cloudflared.log')));
    await saveState(state);
    let tunnelUrl;
    const timeout = Date.now() + 120_000;
    while (!tunnelUrl && Date.now() < timeout) {
      const log = await readFile(path.join(directory, 'cloudflared.log'), 'utf8');
      tunnelUrl = log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0];
      if (!tunnelUrl) await delay();
    }
    assert.ok(tunnelUrl, 'Quick Tunnel URL was not received in time');
    let forbidden = false;
    const probeDeadline = Date.now() + 120_000;
    while (!forbidden && Date.now() < probeDeadline) {
      for (const pid of state.pids) process.kill(-pid, 0);
      try {
        const probe = await fetch(`${tunnelUrl}/healthz`, { signal: AbortSignal.timeout(5000) });
        forbidden = probe.status === 403;
      } catch { /* Quick Tunnel DNS and routing may still be propagating. */ }
      if (!forbidden) await delay();
    }
    assert.ok(forbidden, 'Direct tunnel access must be forbidden');
    await writeFile(artifactFile, JSON.stringify({ tunnelUrl, expiresAt, sha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID }), { mode: 0o600 });
    await appendFile(process.env.GITHUB_ENV, `P0_PREVIEW_EXPIRES_AT=${expiresAt}\nP0_PREVIEW_CONTROL_FILE=${controlFile}\n`);
    console.info(`P0 preview tunnel ready; absolute expiry=${expiresAt}; waiting for a new public control blob`);
  } catch (error) { await cleanup(); throw error; }
}
async function run() {
  const state = await loadState();
  assert.equal(process.env.P0_PREVIEW_EXPIRES_AT, state.expiresAt);
  assert.equal(process.env.P0_PREVIEW_CONTROL_FILE, controlFile);
  const password = process.env.P0_PREVIEW_DATABASE_PASSWORD;
  assert.ok(password, 'Disposable database password is required');
  const databaseUrl = `postgres://postgres:${encodeURIComponent(password)}@127.0.0.1:5432/p0_ci`;
  console.info(`::add-mask::${databaseUrl}`);
  const env = { ...process.env, PG_DATABASE_URL: databaseUrl, REDIS_URL: 'redis://127.0.0.1:6379', TRUST_PROXY: 'loopback', AUTH_COOKIE_SAME_SITE: 'lax' };
  for (const key of ['GITHUB_TOKEN', 'P0_PREVIEW_DATABASE_PASSWORD', 'P0_ORIGIN_SECRET', 'P0_PREVIEW_ORIGIN_SECRET']) delete env[key];
  const supervisor = spawn(process.execPath, ['scripts/preview-backend-session-p0.mjs'], { cwd: root, env, detached: true, stdio: ['ignore', 'inherit', 'inherit'] });
  let stopped = false;
  let supervisorError;
  supervisor.once('error', (error) => { supervisorError = error; stopped = true; });
  supervisor.once('exit', () => { stopped = true; });
  state.pids.push(supervisor.pid);
  await saveState(state);
  const stop = () => { stopped = true; killGroup(supervisor.pid, 'SIGTERM'); };
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
  let acceptedSha;
  try {
    while (!stopped && Date.now() < Date.parse(state.expiresAt)) {
      for (const pid of state.pids.slice(0, 2)) process.kill(-pid, 0);
      try {
        const control = await remoteControl();
        if (control && control.sha !== state.baselineSha && control.sha !== acceptedSha) {
          const validated = validateControl(control.content);
          await writeFile(path.join(directory, 'control.next.json'), validated, { mode: 0o600 });
          await rename(path.join(directory, 'control.next.json'), controlFile);
          acceptedSha = control.sha;
          console.info('P0 preview: new validated public control applied atomically');
        }
      } catch { console.warn('P0 preview: control fetch or validation failed; retaining previous valid control'); }
      for (let i = 0; i < 5 && !stopped; i++) await delay();
    }
    if (supervisorError || supervisor.signalCode || (supervisor.exitCode !== null && supervisor.exitCode !== 0)) throw new Error('Preview backend supervisor failed');
  } finally {
    stop();
    await cleanup();
  }
}

try {
  const command = process.argv[2];
  if (command === 'start') await start();
  else if (command === 'run') await run();
  else if (command === 'cleanup') await cleanup();
  else throw new Error('Expected start, run, or cleanup');
} catch {
  await cleanup().catch(() => {});
  console.error('P0 preview session orchestration failed; private diagnostics are not published');
  process.exitCode = 1;
}
