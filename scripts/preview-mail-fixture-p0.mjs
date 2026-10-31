// Disposable, opt-in capture server. Never configures CRM accounts or sends mail.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import { createHmac } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

export const IMAGE = 'greenmail/standalone:2.1.15@sha256:309ba544ea482e5d4265d09921cdab07c8dad2cc4481d715c9b8ff5d3f0a149f';
export const PORTS = Object.freeze({ imaps: 3993, smtps: 3465 });
const PRIVATE_NAME = 'p0-preview-mail-fixture';
const MARKER = '# hermes-isolated-mail-';
const command = (program, args, input) => execFileSync(program, args, { input, stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000 });

export function fixturePlan(env, now = Date.now()) {
  assert.ok([undefined, 'true', 'false'].includes(env.P0_PREVIEW_MAIL_FIXTURE), 'Fixture opt-in must be true or false');
  if (env.P0_PREVIEW_MAIL_FIXTURE !== 'true') return null;
  assert.match(env.GITHUB_RUN_ID ?? '', /^\d{1,20}$/);
  assert.match(env.GITHUB_RUN_ATTEMPT ?? '', /^\d{1,5}$/);
  assert.match(env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.P0_ORIGIN_SECRET ?? '', /^[a-f0-9]{64}$/);
  assert.match(env.P0_PREVIEW_EXPIRES_AT ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);
  const expires = Date.parse(env.P0_PREVIEW_EXPIRES_AT);
  assert.ok(Number.isFinite(expires) && expires > now && expires <= now + 90 * 60_000, 'Fixture expires with the bounded preview');
  const id = `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  const hostname = `mail-fixture-${id}.test`;
  const derive = (label) => createHmac('sha256', Buffer.from(env.P0_ORIGIN_SECRET, 'hex'))
    .update(`hermes-preview-mail-v1\0${id}\0${env.GITHUB_SHA}\0${label}`).digest('hex');
  const password = derive('mailbox');
  return {
    id, hostname, domain: hostname, name: `hermes-mail-${id}`, network: `hermes-mail-net-${id}`,
    sourceSha: env.GITHUB_SHA, expiresAt: new Date(expires).toISOString(),
    password, keystorePassword: derive('keystore'),
    users: ['operator', 'ada', 'grace'].map((login) => ({ login, email: `${login}@${hostname}` })),
    mode: 'isolated-capture-only', image: IMAGE,
  };
}

export function privateDirectory(env) {
  assert.ok(path.isAbsolute(env.RUNNER_TEMP ?? ''), 'RUNNER_TEMP must be absolute');
  const runner = realpathSync(env.RUNNER_TEMP);
  if (env.GITHUB_WORKSPACE) {
    const workspace = realpathSync(env.GITHUB_WORKSPACE);
    assert.ok(runner !== workspace && !runner.startsWith(`${workspace}${path.sep}`), 'Private material must remain outside Git checkout');
  }
  const directory = path.join(runner, PRIVATE_NAME);
  if (existsSync(directory)) assert.ok(!lstatSync(directory).isSymbolicLink(), 'Private directory must not be a symlink');
  return directory;
}
function privateWrite(file, value) {
  assert.ok(!existsSync(file), 'Refusing to overwrite private material');
  writeFileSync(file, value, { mode: 0o600, flag: 'wx' });
}
export function runtimeEnvironment(plan, directory) {
  return {
    NODE_EXTRA_CA_CERTS: path.join(directory, 'ca.pem'),
    OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS: JSON.stringify([plan.hostname]),
    IMAP_SMTP_ALLOW_SELF_SIGNED: 'false',
    OUTBOUND_HTTP_SAFE_MODE_ENABLED: 'true',
  };
}
export function dockerArguments(plan, directory, uid, gid) {
  return ['run', '--detach', '--name', plan.name, '--network', plan.network,
    '--label', 'hermes.preview.fixture=isolated-mail', '--label', `hermes.preview.expires=${plan.expiresAt}`,
    '--user', `${uid}:${gid}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--memory', '256m', '--cpus', '0.5', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
    '--mount', `type=bind,src=${path.join(directory, 'server.p12')},dst=/fixture/server.p12,readonly`,
    '--env-file', path.join(directory, 'greenmail.env'), IMAGE];
}
function tlsGreeting(plan, ca, port) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = tls.connect({ host: '127.0.0.1', port, servername: plan.hostname, ca,
      rejectUnauthorized: true, minVersion: 'TLSv1.2' });
    const end = (error) => { if (settled) return; settled = true; socket.destroy(); error ? reject(error) : resolve(); };
    socket.setTimeout(3000, () => end(new Error('TLS greeting timed out')));
    socket.on('error', end);
    socket.once('data', (data) => {
      const text = data.toString('utf8');
      end((port === PORTS.smtps ? /^220[ -]/ : /^\* OK /).test(text) ? null : new Error('Unexpected mail protocol greeting'));
    });
  });
}
async function verifyFixture(plan, directory) {
  const inspect = JSON.parse(command('docker', ['inspect', plan.name]).toString())[0];
  assert.equal(Object.values(inspect.NetworkSettings.Ports).filter((entry) => entry !== null).length, 0, 'Internal container must publish no ports');
  const network = JSON.parse(command('docker', ['network', 'inspect', plan.network]).toString())[0];
  assert.equal(network.Internal, true, 'Fixture must not reach external mail servers');
  const ca = readFileSync(path.join(directory, 'ca.pem'));
  const deadline = Math.min(Date.now() + 45_000, Date.parse(plan.expiresAt));
  while (Date.now() < deadline) {
    try { await Promise.all(Object.values(PORTS).map((port) => tlsGreeting(plan, ca, port))); return; }
    catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error('Isolated mail TLS/protocol readiness failed');
}
export function assertInternalAddress(value) {
  assert.match(value ?? '', /^(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/);
  assert.equal(net.isIP(value), 4);
  return value;
}
async function startForwarding(plan, directory, env) {
  // Docker does not publish ports for exclusively --internal networks. Keep
  // that isolation; the runner forwards two loopback sockets to one fixed IP.
  const container = JSON.parse(command('docker', ['inspect', plan.name]).toString())[0];
  const target = assertInternalAddress(container.NetworkSettings.Networks[plan.network].IPAddress);
  assert.equal(Object.keys(container.NetworkSettings.Networks).length, 1, 'Fixture must join its internal network only');
  const state = { ...plan, target };
  writeFileSync(path.join(directory, 'state.json'), JSON.stringify(state), { mode: 0o600 });
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'forward', plan.id], {
    env: { PATH: env.PATH, RUNNER_TEMP: env.RUNNER_TEMP, GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: env.GITHUB_WORKSPACE },
    detached: true, stdio: 'ignore',
  });
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  writeFileSync(path.join(directory, 'state.json'), JSON.stringify({ ...state, forwardPid: child.pid, forwardBirth: readFileSync(`/proc/${child.pid}/stat`, 'utf8').split(') ')[1].split(' ')[19] }), { mode: 0o600 });
  const deadline = Math.min(Date.now() + 5000, Date.parse(plan.expiresAt));
  while (!existsSync(path.join(directory, 'forward-ready.json')) && Date.now() < deadline) {
    process.kill(child.pid, 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(existsSync(path.join(directory, 'forward-ready.json')), 'Loopback forwarding did not start');
}
export function createLoopbackForwarder(target, port) {
  assertInternalAddress(target);
  assert.ok(Object.values(PORTS).includes(port));
  const sockets = new Set();
  const server = net.createServer((incoming) => {
    if (sockets.size >= 32) { incoming.destroy(); return; }
    const outgoing = net.connect({ host: target, port });
    for (const socket of [incoming, outgoing]) {
      sockets.add(socket);
      socket.setTimeout(120_000, () => socket.destroy());
      socket.once('close', () => sockets.delete(socket));
      socket.on('error', () => { incoming.destroy(); outgoing.destroy(); });
    }
    incoming.pipe(outgoing); outgoing.pipe(incoming);
  });
  return { server, stop: () => { for (const socket of sockets) socket.destroy(); server.close(); } };
}
export function matchesForwardProcess(plan, cmdline, birth) {
  const args = cmdline.split('\0').filter(Boolean);
  return args.length === 4 && args[1] === fileURLToPath(import.meta.url) && args[2] === 'forward' && args[3] === plan.id && birth === plan.forwardBirth;
}
async function forward(env, identity) {
  assert.equal(env.GITHUB_ACTIONS, 'true');
  const directory = privateDirectory(env);
  const plan = JSON.parse(readFileSync(path.join(directory, 'state.json'), 'utf8'));
  assert.equal(identity, plan.id);
  const remaining = Date.parse(plan.expiresAt) - Date.now();
  assert.ok(remaining > 0 && remaining <= 90 * 60_000);
  const forwarders = Object.values(PORTS).map((port) => createLoopbackForwarder(plan.target, port));
  const stop = () => { for (const value of forwarders) value.stop(); process.exit(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  setTimeout(stop, remaining);
  for (const [index, value] of forwarders.entries()) {
    await new Promise((resolve, reject) => { value.server.once('error', reject); value.server.listen(Object.values(PORTS)[index], '127.0.0.1', resolve); });
    assert.equal(value.server.address().address, '127.0.0.1');
  }
  privateWrite(path.join(directory, 'forward-ready.json'), JSON.stringify({ host: '127.0.0.1', ports: Object.values(PORTS), expiresAt: plan.expiresAt }));
}
function writeHosts(plan, remove = false) {
  const marker = `${MARKER}${plan.id}`;
  const previous = readFileSync('/etc/hosts', 'utf8');
  const lines = previous.split('\n').filter((line) => !line.endsWith(marker));
  if (!remove) lines.push(`127.0.0.1 ${plan.hostname} ${marker}`);
  command('sudo', ['tee', '/etc/hosts'], `${lines.filter(Boolean).join('\n')}\n`);
}
export function generateFixtureCertificates(plan, directory) {
  // No private credential is passed as a CLI argument or written to public artifacts.
  privateWrite(path.join(directory, 'keystore-password'), plan.keystorePassword);
  const openssl = (args) => command('openssl', args);
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'ca.key'),
    '-out', path.join(directory, 'ca.pem'), '-days', '1', '-subj', '/CN=Hermes isolated preview CA',
    '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  openssl(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'server.key'),
    '-out', path.join(directory, 'server.csr'), '-subj', `/CN=${plan.hostname}`]);
  privateWrite(path.join(directory, 'server.ext'), `subjectAltName=DNS:${plan.hostname}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`);
  openssl(['x509', '-req', '-in', path.join(directory, 'server.csr'), '-CA', path.join(directory, 'ca.pem'),
    '-CAkey', path.join(directory, 'ca.key'), '-CAcreateserial', '-out', path.join(directory, 'server.pem'),
    '-days', '1', '-extfile', path.join(directory, 'server.ext')]);
  openssl(['pkcs12', '-export', '-out', path.join(directory, 'server.p12'), '-inkey', path.join(directory, 'server.key'),
    '-in', path.join(directory, 'server.pem'), '-certfile', path.join(directory, 'ca.pem'),
    '-passout', `file:${path.join(directory, 'keystore-password')}`]);
  for (const name of ['ca.key', 'ca.pem', 'ca.srl', 'server.key', 'server.csr', 'server.pem', 'server.p12']) chmodSync(path.join(directory, name), 0o600);
}
async function start(env) {
  const plan = fixturePlan(env);
  if (plan === null) return;
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Only disposable GitHub Actions runners may start the fixture');
  // GitHub workflow commands register redaction; no plaintext diagnostic logs.
  for (const secret of [plan.password, plan.keystorePassword]) console.info(`::add-mask::${secret}`);
  const directory = privateDirectory(env);
  assert.ok(!existsSync(directory), 'Fixture has already been prepared');
  mkdirSync(directory, { mode: 0o700 });
  privateWrite(path.join(directory, 'state.json'), JSON.stringify(plan));
  let phase = 'certificates';
  try {
    generateFixtureCertificates(plan, directory);
    const users = plan.users.map((user) => `${user.login}:${plan.password}@${plan.domain}`).join(',');
    privateWrite(path.join(directory, 'greenmail.env'), `GREENMAIL_OPTS=-Dgreenmail.setup.test.imaps -Dgreenmail.setup.test.smtps -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=${users} -Dgreenmail.tls.keystore.file=/fixture/server.p12 -Dgreenmail.tls.keystore.password=${plan.keystorePassword}\n`);
    phase = 'network';
    command('docker', ['network', 'create', '--internal', plan.network]);
    phase = 'container';
    command('docker', dockerArguments(plan, directory, process.getuid(), process.getgid()));
    phase = 'loopback-forwarding';
    await startForwarding(plan, directory, env);
    phase = 'verified-bindings-and-TLS';
    await verifyFixture(plan, directory);
    phase = 'host-mapping';
    writeHosts(plan);
    const runtime = runtimeEnvironment(plan, directory);
    assert.ok(env.GITHUB_ENV && path.isAbsolute(env.GITHUB_ENV));
    // Only non-secret paths, TLS enforcement and one exact hostname enter GITHUB_ENV.
    writeFileSync(env.GITHUB_ENV, Object.entries(runtime).map(([key, value]) => `${key}=${value}\n`).join(''), { flag: 'a' });
    console.info(`Isolated mail capture ready (no external delivery); expires=${plan.expiresAt}`);
  } catch (error) {
    console.error(`Isolated mail fixture failed during ${phase}; category=${error?.name === 'AssertionError' ? 'boundary' : 'command-or-protocol'}`);
    if (phase === 'verified-bindings-and-TLS') {
      try {
        const value = JSON.parse(command('docker', ['inspect', plan.name]).toString())[0];
        console.error(JSON.stringify({ status: value.State.Status, exitCode: value.State.ExitCode, oomKilled: value.State.OOMKilled, bindings: value.NetworkSettings.Ports }));
      } catch { /* Never dump raw docker errors or container environment. */ }
    }
    await cleanup(env);
    throw new Error('Isolated mail fixture setup failed; details and secrets withheld');
  }
}
async function cleanup(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Cleanup is runner-only');
  const directory = privateDirectory(env);
  const file = path.join(directory, 'state.json');
  if (!existsSync(file)) return;
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  assert.match(plan.id ?? '', /^\d{1,20}-\d{1,5}$/);
  assert.equal(plan.name, `hermes-mail-${plan.id}`);
  assert.equal(plan.network, `hermes-mail-net-${plan.id}`);
  assert.equal(plan.hostname, `mail-fixture-${plan.id}.test`);
  let failure;
  // Best effort independent operations; never skip one because another failed.
  for (const operation of [
    () => {
      if (!plan.forwardPid) return;
      assert.ok(Number.isInteger(plan.forwardPid) && plan.forwardPid > 1);
      try {
        const base = `/proc/${plan.forwardPid}`;
        const birth = readFileSync(`${base}/stat`, 'utf8').split(') ')[1].split(' ')[19];
        assert.ok(matchesForwardProcess(plan, readFileSync(`${base}/cmdline`, 'utf8'), birth), 'Refusing to kill a reused PID');
        process.kill(-plan.forwardPid, 'SIGTERM');
      } catch (error) { if (!['ESRCH', 'ENOENT'].includes(error.code)) throw error; }
    },
    () => command('docker', ['rm', '--force', plan.name]),
    () => command('docker', ['network', 'rm', plan.network]),
    () => writeHosts(plan, true),
  ]) { try { operation(); } catch { failure = true; } }
  rmSync(directory, { recursive: true });
  if (failure) throw new Error('Mail fixture cleanup was incomplete; runner teardown is required');
}
export async function main(env, action) {
  if (action === 'start') return start(env);
  if (action === 'forward') return forward(env, process.argv[3]);
  if (action === 'cleanup') return cleanup(env);
  if (action === 'parameters') {
    // Owner derives the same ephemeral credentials locally from the existing origin
    // secret + public run/attempt/SHA/expiry. No credential artifact is uploaded.
    const plan = fixturePlan(env);
    assert.ok(plan && path.isAbsolute(env.P0_FIXTURE_PARAMETERS_FILE ?? ''));
    const parent = realpathSync(path.dirname(env.P0_FIXTURE_PARAMETERS_FILE));
    if (env.GITHUB_WORKSPACE) {
      const workspace = realpathSync(env.GITHUB_WORKSPACE);
      assert.ok(parent !== workspace && !parent.startsWith(workspace + path.sep), 'Credentials must stay outside Git');
    }
    privateWrite(env.P0_FIXTURE_PARAMETERS_FILE, JSON.stringify({ mode: plan.mode, sourceSha: plan.sourceSha,
      expiresAt: plan.expiresAt, host: plan.hostname, domain: plan.domain, imapPort: PORTS.imaps, smtpPort: PORTS.smtps,
      security: 'SSL_TLS', password: plan.password, users: plan.users }, null, 2));
    return;
  }
  throw new Error('Expected start, cleanup, or parameters');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.env, process.argv[2]).catch(() => { console.error('Isolated preview mail fixture failed (no secrets printed)'); process.exitCode = 1; });
}
