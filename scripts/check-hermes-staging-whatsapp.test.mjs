import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { IMAGES, VERSION, planFor, prepare, readPlan } from '../infra/hermes-staging/whatsapp/config.mjs';
import { newInstancePayload, webhookPayload, qrBytes, providerRequest, providerError, safeReadiness } from '../infra/hermes-staging/whatsapp/client.mjs';
import { validateProviderEnvironment, runQuiet } from '../infra/hermes-staging/whatsapp/bootstrap.mjs';
import { validateRunner } from './check-hermes-staging-whatsapp.mjs';
const enabled = { KOVAALABCRM_WA_ENABLED: 'true', KOVAALABCRM_WA_ID: 'alpha-20261031' };
const source = (file) => readFileSync(new URL(`../infra/hermes-staging/whatsapp/${file}`, import.meta.url), 'utf8');
test('WA preparation is off by default and identifiers cannot escape paths/origins', () => {
  assert.equal(planFor({}), null); assert.equal(planFor({ KOVAALABCRM_WA_ENABLED: 'false' }), null);
  const plan = planFor(enabled); assert.equal(plan.baseUrl, 'https://evolution-kovaalabcrm-alpha-20261031.test:8443');
  assert.equal(VERSION, '2.3.6');
  for (const id of ['../../production', 'existing.other.test', '*', 'alpha?apikey=secret']) assert.throws(() => planFor({ ...enabled, KOVAALABCRM_WA_ID: id }));
  for (const image of Object.values(IMAGES)) assert.match(image, /@sha256:[a-f0-9]{64}$/);
});
test('preparation creates a complete atomic private target with independent secrets/90-day exact SAN', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-wa-prepare-test-'));
  try {
    const directory = path.join(temporary, 'private'), plan = prepare(directory, enabled);
    assert.deepEqual(readPlan(directory), plan);
    const credentials = JSON.parse(readFileSync(`${directory}/credentials.json`, 'utf8'));
    assert.equal(new Set(Object.values(credentials)).size, 5);
    for (const key of Object.values(credentials)) assert.match(key, /^[a-f0-9]{64}$/);
    assert.equal(statSync(directory).mode & 0o777, 0o700);
    for (const name of ['provider.env', 'provisioner.env', 'credentials.json', 'operator.json', 'postgres.env', 'redis.env', 'ca.key', 'server.key']) assert.equal(statSync(`${directory}/${name}`).mode & 0o777, 0o600);
    assert.equal(existsSync(`${directory}/ca.srl`), false);
    const cert = execFileSync('openssl', ['x509', '-in', `${directory}/server.pem`, '-noout', '-text']).toString();
    assert.ok(cert.includes(`DNS:${plan.hostname}`));
    execFileSync('openssl', ['verify', '-CAfile', `${directory}/ca.pem`, `${directory}/server.pem`]);
    const dates = execFileSync('openssl', ['x509', '-in', `${directory}/server.pem`, '-noout', '-dates']).toString().trim().split('\n').map((line) => Date.parse(line.split('=').slice(1).join('=')));
    assert.equal(dates[1] - dates[0], 90 * 86400000);
    assert.throws(() => prepare(directory, enabled));
    assert.deepEqual(JSON.parse(readFileSync(`${directory}/credentials.json`, 'utf8')), credentials);
    const env = Object.fromEntries(readFileSync(`${directory}/provider.env`, 'utf8').trim().split('\n').map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
    assert.doesNotThrow(() => validateProviderEnvironment(env));
    assert.equal(env.DATABASE_SAVE_DATA_HISTORIC, 'false');
    const provisioner = readFileSync(`${directory}/provisioner.env`, 'utf8');
    assert.ok(provisioner.includes(credentials.globalKey)); assert.ok(!provisioner.includes(credentials.instanceToken));
  } finally { rmSync(temporary, { recursive: true }); }
});
test('prepare refuses existing target/symlink without replacing content or creating partial ready state', () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-wa-refusal-test-'));
  try { const target = path.join(temporary, 'existing'); mkdirSync(target); writeFileSync(`${target}/keep`, 'original'); assert.throws(() => prepare(target, enabled)); assert.equal(readFileSync(`${target}/keep`, 'utf8'), 'original'); }
  finally { rmSync(temporary, { recursive: true }); }
});
test('instance provisioning starts unpaired with webhook/history/read/presence disabled', () => {
  const plan = planFor(enabled), payload = newInstancePayload(plan, 'a'.repeat(64));
  assert.equal(payload.integration, 'WHATSAPP-BAILEYS');
  for (const key of ['qrcode', 'syncFullHistory', 'readMessages', 'readStatus', 'alwaysOnline']) assert.equal(payload[key], false);
  assert.equal(payload.webhook.enabled, false);
  const webhook = webhookPayload(plan, '11111111-1111-4111-8111-111111111111', 'b'.repeat(64));
  assert.equal(webhook.webhook.enabled, false); assert.equal(webhook.webhook.byEvents, false);
  assert.ok(webhook.webhook.url.endsWith('/11111111-1111-4111-8111-111111111111'));
  assert.deepEqual(webhook.webhook.events, ['MESSAGES_UPSERT', 'SEND_MESSAGE']);
});
test('provider network/TLS isolation and durable state do not reuse mail or existing projects', () => {
  const compose = source('compose.yaml');
  assert.match(compose, /^name: kovaalabcrm-wa-staging/);
  assert.match(compose, /networks: \[data, backend, egress\]/);
  assert.equal((compose.match(/internal: true/g) ?? []).length, 3);
  assert.equal((compose.match(/logging: \{driver: none\}/g) ?? []).length, 2);
  assert.match(compose, /caddyfile >\/dev\/null 2>&1/);
  assert.match(source('config.mjs'), /output discard/);
  assert.match(compose, /instances:\/evolution\/instances/);
  assert.doesNotMatch(compose, /ports:|docker.sock|privileged:|pid: host|external:|mail-fixture|Brume|Odoo|NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.doesNotMatch(source('config.mjs'), /SSL_CONF_PRIVKEY|rejectUnauthorized: false/);
});
test('native startup output never inherits Docker logs and failures stop the sequence', async () => {
  const secret = 'postgresql://private:secret@db';
  const fake = (exitCode) => (command, args, options) => {
    assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => { child.stdout.write(secret); child.stderr.write(secret); child.emit('exit', exitCode, null); }); return child;
  };
  await runQuiet('npm', ['run', 'db:deploy'], {}, 'migration', fake(0));
  await assert.rejects(runQuiet('npm', ['run', 'db:deploy'], {}, 'migration', fake(1)), (error) => error.phase === 'migration' && !error.message.includes(secret));
  assert.doesNotMatch(source('bootstrap.mjs'), /stdio: 'inherit'|deploy_database\.sh/);
});
test('QR decoding is bounded PNG-only, and URL routes cannot change provider origin', () => {
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('test')]);
  assert.deepEqual(qrBytes({ base64: `data:image/png;base64,${png.toString('base64')}` }), png);
  for (const value of ['https://other.test/image.png', 'data:text/html;base64,Zm9v', 'data:image/png;base64,Zm9v']) assert.throws(() => qrBytes({ base64: value }));
  const plan = planFor(enabled);
  assert.throws(() => providerRequest(plan, 'a'.repeat(64), 'GET', '//different.test/path'));
  assert.throws(() => providerRequest(plan, 'a'.repeat(64), 'GET', '/path#fragment'));
});
test('real QR/pairing actions are operator-only diagnostics and require webhook off', () => {
  const operator = source('operator.mjs');
  assert.match(operator, /assert.notEqual\(process.env.GITHUB_ACTIONS, 'true'/);
  assert.match(operator, /assert.equal\(webhook\?\.enabled, false/);
  assert.match(operator, /readFileSync\(0, 'utf8'\)/);
  assert.match(operator, /process.stdout.isTTY/);
  assert.doesNotMatch(operator, /sendText|sendMedia|sendWhatsAppAudio/);
});
test('cloud smoke is runner-only and cannot overwrite arbitrary reports', () => {
  assert.throws(() => validateRunner({}));
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-wa-runner-test-'));
  try { const env = { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HERMES_SOURCE_SHA: 'a'.repeat(40), RUNNER_TEMP: temporary }; assert.doesNotThrow(() => validateRunner(env)); assert.throws(() => validateRunner({ ...env, HERMES_STAGING_WA_REPORT_FILE: '/outside/report.json' })); }
  finally { rmSync(temporary, { recursive: true }); }
});

test('readiness diagnostics retain only bounded phase/code/status/semver and reject private payloads', () => {
  const secret = 'private-global-key-and-phone';
  const error = providerError('http-status', { code: secret, httpStatus: 401, message: secret });
  assert.deepEqual(error.providerDiagnostic, { category: 'http-status', httpStatus: 401 });
  assert.ok(!error.message.includes(secret));
  assert.deepEqual(safeReadiness({ phase: 'https-request', success: false, category: 'transport', code: 'ECONNREFUSED', httpStatus: 502, version: '2.3.7', url: secret, apiKey: secret, phone: secret }), { phase: 'https-request', category: 'transport', code: 'ECONNREFUSED', httpStatus: 502, version: '2.3.7', success: false });
  assert.deepEqual(safeReadiness({ phase: 'version', category: 'version-mismatch', version: secret, code: secret, httpStatus: secret }), { phase: 'version', category: 'version-mismatch' });
  assert.equal(safeReadiness({ phase: secret }), undefined);
  assert.equal(safeReadiness({ phase: 'version', version: '2.3.6\nprivate-data' }).version, undefined);
});
test('readiness missing-private-file failure prints no path, token, phone or native stack', () => {
  const secret = 'private-secret-phone-marker';
  const child = spawnSync(process.execPath, [new URL('../infra/hermes-staging/whatsapp/readiness.mjs', import.meta.url).pathname], { env: { ...process.env, KOVAALABCRM_WA_PRIVATE_DIR: `/nonexistent-${secret}` }, encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.deepEqual(JSON.parse(child.stdout), { phase: 'private-files', category: 'client-validation', code: 'ENOENT', success: false });
  assert.ok(!(child.stdout + child.stderr).includes(secret));
  assert.equal(child.stderr, '');
});
