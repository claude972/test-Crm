import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import tls from 'node:tls';
import { IMAGE, PORTS, dockerArguments, fixturePlan, generateFixtureCertificates, main, privateDirectory, runtimeEnvironment } from './preview-mail-fixture-p0.mjs';

const now = Date.parse('2026-10-31T16:00:00Z');
const env = (extra = {}) => ({ P0_PREVIEW_MAIL_FIXTURE: 'true', GITHUB_RUN_ID: '123456', GITHUB_RUN_ATTEMPT: '2',
  GITHUB_SHA: 'a'.repeat(40), P0_ORIGIN_SECRET: 'b'.repeat(64), P0_PREVIEW_EXPIRES_AT: new Date(now + 60 * 60_000).toISOString(), ...extra });
const plan = fixturePlan(env(), now);
function temporary(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'hermes-mail-fixture-test-'));
  try { return run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('fixture defaults off and push does not opt in', async () => {
  assert.equal(fixturePlan({}), null);
  assert.equal(fixturePlan({ P0_PREVIEW_MAIL_FIXTURE: 'false' }), null);
  assert.throws(() => fixturePlan({ P0_PREVIEW_MAIL_FIXTURE: '*' }));
  await main({}, 'start'); // No Docker, files, DNS or secrets needed while off.
  const workflow = readFileSync(new URL('../.github/workflows/p0-preview-session.yml', import.meta.url), 'utf8');
  assert.match(workflow, /isolated-mail-fixture:[\s\S]*?default: false/);
  assert.match(workflow, /github.event_name == 'workflow_dispatch' && inputs.isolated-mail-fixture/);
});

test('credentials are deterministic only for exact secret, run, attempt and SHA', () => {
  assert.deepEqual(fixturePlan(env(), now), plan);
  for (const extra of [{ GITHUB_RUN_ID: '123457' }, { GITHUB_RUN_ATTEMPT: '3' }, { GITHUB_SHA: 'c'.repeat(40) }, { P0_ORIGIN_SECRET: 'd'.repeat(64) }]) {
    assert.notEqual(fixturePlan(env(extra), now).password, plan.password);
  }
  assert.notEqual(plan.password, plan.keystorePassword);
  assert.equal(plan.mode, 'isolated-capture-only');
  assert.ok(plan.users.every((user) => user.email.endsWith(`@${plan.hostname}`)));
});

test('rejects malformed identity, secret and expired or overlong preview', () => {
  for (const extra of [{ GITHUB_RUN_ID: '../bad' }, { GITHUB_RUN_ATTEMPT: '2;echo' }, { GITHUB_SHA: 'latest' },
    { P0_ORIGIN_SECRET: '' }, { P0_PREVIEW_EXPIRES_AT: new Date(now).toISOString() },
    { P0_PREVIEW_EXPIRES_AT: new Date(now + 90 * 60_000 + 1).toISOString() }]) {
    assert.throws(() => fixturePlan(env(extra), now));
  }
});

test('only one exact .test host allowlisted; real certificate checks and safe mode remain active', () => {
  const runtime = runtimeEnvironment(plan, '/runner/private');
  assert.deepEqual(JSON.parse(runtime.OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS), [plan.hostname]);
  assert.equal(runtime.IMAP_SMTP_ALLOW_SELF_SIGNED, 'false');
  assert.equal(runtime.OUTBOUND_HTTP_SAFE_MODE_ENABLED, 'true');
  assert.equal(runtime.NODE_EXTRA_CA_CERTS, '/runner/private/ca.pem');
  assert.ok(!JSON.stringify(runtime).includes(plan.password));
});

test('Docker uses pinned image and private env file, internal network, loopback TLS ports only', () => {
  const args = dockerArguments(plan, '/runner/private', 1001, 1001);
  assert.equal(args.at(-1), IMAGE);
  assert.match(IMAGE, /@sha256:[a-f0-9]{64}$/);
  const ports = args.flatMap((value, index) => value === '--publish' ? [args[index + 1]] : []);
  assert.deepEqual(ports, ['127.0.0.1:3993:3993', '127.0.0.1:3465:3465']);
  assert.equal(args[args.indexOf('--network') + 1], plan.network);
  assert.equal(args[args.indexOf('--env-file') + 1], '/runner/private/greenmail.env');
  assert.ok(!args.join(' ').includes(plan.password));
  assert.ok(!args.join(' ').includes(plan.keystorePassword));
  assert.ok(args.includes('--read-only'));
  assert.ok(args.includes('no-new-privileges'));
});

test('private paths reject checkout locations and symlink escape', () => temporary((directory) => {
  const workspace = path.join(directory, 'repo'); mkdirSync(workspace);
  const inside = path.join(workspace, 'tmp'); mkdirSync(inside);
  assert.throws(() => privateDirectory({ RUNNER_TEMP: inside, GITHUB_WORKSPACE: workspace }));
  symlinkSync(inside, path.join(directory, 'linked'));
  assert.throws(() => privateDirectory({ RUNNER_TEMP: path.join(directory, 'linked'), GITHUB_WORKSPACE: workspace }));
  symlinkSync(workspace, path.join(directory, 'p0-preview-mail-fixture'));
  assert.throws(() => privateDirectory({ RUNNER_TEMP: directory, GITHUB_WORKSPACE: workspace }));
}));

test('owner can derive parameters privately without creating a CRM account or starting a server', async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'hermes-mail-parameters-'));
  try {
    const parametersFile = path.join(directory, 'parameters.json');
    const freshEnv = env({ P0_PREVIEW_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(), P0_FIXTURE_PARAMETERS_FILE: parametersFile });
    await main(freshEnv, 'parameters');
    const value = JSON.parse(readFileSync(parametersFile, 'utf8'));
    assert.equal(statSync(parametersFile).mode & 0o777, 0o600);
    assert.equal(value.security, 'SSL_TLS');
    assert.equal(value.host, plan.hostname);
    assert.equal(value.mode, 'isolated-capture-only');
    assert.deepEqual(readdirSync(directory), ['parameters.json']);
    await assert.rejects(main(freshEnv, 'parameters')); // Refuses replacing an existing credential file.
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('real TLS fixture certificates verify CA and SAN and reject another hostname', async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'hermes-mail-tls-'));
  let server;
  try {
    generateFixtureCertificates(plan, directory);
    for (const name of readdirSync(directory)) assert.equal(statSync(path.join(directory, name)).mode & 0o777, 0o600);
    const ca = readFileSync(path.join(directory, 'ca.pem'));
    execFileSync('openssl', ['verify', '-CAfile', path.join(directory, 'ca.pem'), path.join(directory, 'server.pem')], { stdio: 'pipe' });
    const certificate = new X509Certificate(readFileSync(path.join(directory, 'server.pem')));
    assert.equal(certificate.checkHost(plan.hostname), plan.hostname);
    assert.equal(certificate.checkHost('wrong.test'), undefined);
    server = tls.createServer({ key: readFileSync(path.join(directory, 'server.key')), cert: readFileSync(path.join(directory, 'server.pem')) }, (socket) => socket.end('fixture TLS only\n'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    await new Promise((resolve, reject) => {
      const socket = tls.connect({ host: '127.0.0.1', port: server.address().port, servername: plan.hostname, ca, rejectUnauthorized: true }, () => {
        assert.equal(socket.authorized, true); socket.destroy(); resolve();
      });
      socket.once('error', reject);
    });
    assert.equal(PORTS.imaps, 3993); assert.equal(PORTS.smtps, 3465);
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); rmSync(directory, { recursive: true, force: true }); }
});

test('workflow cleanup is unconditional and no private fixture artifact is uploaded', () => {
  const workflow = readFileSync(new URL('../.github/workflows/p0-preview-session.yml', import.meta.url), 'utf8');
  assert.match(workflow, /Remove isolated mail capture[\s\S]*?always\(\)[\s\S]*?preview-mail-fixture-p0.mjs cleanup/);
  assert.match(workflow, /path: \$\{\{ runner.temp \}\}\/p0-preview-session\/public\/tunnel.json/);
  assert.ok(!workflow.includes('path: ${{ runner.temp }}/p0-preview-mail-fixture'));
  const source = readFileSync(new URL('./preview-mail-fixture-p0.mjs', import.meta.url), 'utf8');
  assert.match(source, /\['network', 'create', '--internal', plan.network\]/);
  assert.ok(!source.includes('greenmail.auth.disabled'));
  assert.ok(!source.includes('NODE_TLS_REJECT_UNAUTHORIZED'));
});
