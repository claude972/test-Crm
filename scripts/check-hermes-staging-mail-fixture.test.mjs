import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fixturePlan, prepare, readPlan, MAX_AGE, GREENMAIL_IMAGE, NODE_IMAGE } from '../infra/hermes-staging/mail-fixture/config.mjs';
import { javaIdentity } from '../infra/hermes-staging/mail-fixture/expiry.mjs';
import { validateRunner } from './check-hermes-staging-mail-fixture.mjs';
const enabled = (extra = {}) => ({ KOVAALABCRM_MAIL_FIXTURE_ENABLED: 'true', KOVAALABCRM_MAIL_FIXTURE_ID: 'isolated-test-20261031', ...extra });
const file = (name) => readFileSync(new URL(`../infra/hermes-staging/mail-fixture/${name}`, import.meta.url), 'utf8');
test('provider is off by default; enabling needs a bounded canonical fixture ID and expiry', () => {
  assert.equal(fixturePlan({}), null);
  assert.equal(fixturePlan({ KOVAALABCRM_MAIL_FIXTURE_ENABLED: 'false' }), null);
  const now = Date.now(), plan = fixturePlan(enabled(), now);
  assert.equal(Date.parse(plan.expiresAt), now + MAX_AGE);
  for (const extra of [{ KOVAALABCRM_MAIL_FIXTURE_ID: '../../existing' }, { KOVAALABCRM_MAIL_FIXTURE_ID: '*.test' }, { KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT: new Date(now - 1).toISOString() }, { KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT: new Date(now + MAX_AGE + 1000).toISOString() }]) assert.throws(() => fixturePlan(enabled(extra), now));
});
test('prepare produces private stable independent secrets and exact SAN/CA without CRM data or reset', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-mail-test-'));
  try {
    const directory = path.join(root, 'private');
    const plan = prepare(directory, enabled());
    assert.deepEqual(readPlan(directory), plan);
    const credentials = JSON.parse(readFileSync(path.join(directory, 'credentials.json'), 'utf8'));
    assert.deepEqual(Object.keys(credentials), ['operator', 'ada', 'grace']);
    assert.equal(new Set(Object.values(credentials)).size, 3);
    for (const secret of Object.values(credentials)) assert.match(secret, /^[a-f0-9]{64}$/);
    for (const name of ['credentials.json', 'provider.env', 'application.env', 'expiry.env', 'root-secret', 'server.p12', 'server.key', 'ca.key']) assert.equal(statSync(path.join(directory, name)).mode & 0o777, 0o600);
    assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.throws(() => prepare(directory, enabled()));
    assert.deepEqual(JSON.parse(readFileSync(path.join(directory, 'credentials.json'), 'utf8')), credentials);
    const certificate = execFileSync('openssl', ['x509', '-in', path.join(directory, 'server.pem'), '-noout', '-text']).toString();
    assert.ok(certificate.includes(`DNS:${plan.hostname}`));
    execFileSync('openssl', ['verify', '-CAfile', path.join(directory, 'ca.pem'), path.join(directory, 'server.pem')]);
    assert.ok(!existsSync(path.join(directory, 'crm-seed.sql')));
    const environment = readFileSync(path.join(directory, 'application.env'), 'utf8');
    assert.ok(environment.includes('IMAP_SMTP_ALLOW_SELF_SIGNED=false'));
    assert.ok(environment.includes(`OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS=["${plan.hostname}"]`));
    assert.ok(!Object.values(credentials).some((secret) => environment.includes(secret)));
  } finally { rmSync(root, { recursive: true }); }
});
test('overlay isolates provider and makes its profile explicit; only public CA enters app containers', () => {
  const compose = file('compose.yaml');
  assert.equal((compose.match(/profiles: \[mail-fixture\]/g) ?? []).length, 2);
  assert.match(compose, /internal: true/);
  assert.match(compose, /pid: service:mail-fixture/);
  assert.match(compose, /network_mode: none/);
  assert.doesNotMatch(compose, /ports:|privileged:|network_mode: host|pid: host|docker.sock|external:|restart: unless-stopped/);
  const apps = compose.slice(compose.indexOf('  server:'));
  assert.equal((apps.match(/ca.pem:.*:ro/g) ?? []).length, 2);
  assert.doesNotMatch(apps, /credentials|server.p12|ca.key/);
  assert.match(GREENMAIL_IMAGE, /^greenmail\/standalone:2\.1\.15@sha256:[a-f0-9]{64}$/);
  assert.match(NODE_IMAGE, /^node:24-bookworm-slim@sha256:[a-f0-9]{64}$/);
});
test('expiry guard requires shared non-host namespace evidence and never resets the provider', () => {
  const guard = file('expiry.mjs');
  assert.match(guard, /process.pid !== 1/);
  assert.match(guard, /\/proc\/1\/environ/);
  assert.match(guard, /KOVAALABCRM_FIXTURE_NAMESPACE/);
  assert.match(guard, /process.kill\(target.pid, 'SIGTERM'\)/);
  assert.match(guard, /process.kill\(target.pid, 'SIGKILL'\)/);
  assert.doesNotMatch(guard, /process.kill\(1,/);
  assert.match(guard, /value.pid === target.pid && value.birth === target.birth/);
  assert.doesNotMatch(guard, /execFile|docker.sock|rmSync|writeFile|rejectUnauthorized/);
});
test('probe retains TLS verification and performs negative/authenticated protocol tests, no CRM API', () => {
  const probe = file('probe.mjs');
  for (const contract of ['rejectUnauthorized: true', 'ca: []', 'wrong-', 'invalid-password', 'Drafts', 'Sent', 'Trash', 'APPEND', 'RFC822.SIZE', 'UIDVALIDITY', 'AUTH PLAIN', "host: '1.1.1.1'"]) assert.ok(probe.includes(contract), contract);
  assert.doesNotMatch(probe, /rejectUnauthorized: false|NODE_TLS_REJECT_UNAUTHORIZED|graphql|PG_DATABASE_URL|prisma|typeorm|seed/i);
});
test('cloud smoke refuses normal hosts and report escape paths', () => {
  assert.throws(() => validateRunner({}));
  const root = mkdtempSync(path.join(os.tmpdir(), 'kovaalabcrm-runner-test-'));
  try {
    const env = { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HERMES_SOURCE_SHA: 'a'.repeat(40), RUNNER_TEMP: root };
    assert.doesNotThrow(() => validateRunner(env));
    assert.throws(() => validateRunner({ ...env, HERMES_STAGING_MAIL_REPORT_FILE: '/outside/report.json' }));
  } finally { rmSync(root, { recursive: true }); }
});

test('hard expiry targets a verified non-init Java identity and cloud suspends it before expiry', () => {
  const env = 'KOVAALABCRM_FIXTURE_NAMESPACE=synthetic-test\0GREENMAIL_OPTS=-Dgreenmail.tls.keystore.file=/fixture/server.p12\0';
  assert.equal(javaIdentity('/opt/java/bin/java\0-jar\0/home/greenmail/greenmail-standalone.jar\0', env, 'synthetic-test'), true);
  assert.equal(javaIdentity('/bin/sh\0-jar\0/home/greenmail/greenmail-standalone.jar\0', env, 'synthetic-test'), false);
  assert.equal(javaIdentity('/opt/java/bin/java\0-jar\0/other.jar\0', env, 'synthetic-test'), false);
  assert.equal(javaIdentity('/opt/java/bin/java\0-jar\0/home/greenmail/greenmail-standalone.jar\0', env, 'other-fixture'), false);
  const smoke = readFileSync(new URL('./check-hermes-staging-mail-fixture.mjs', import.meta.url), 'utf8');
  assert.match(smoke, /process.kill\(values\[0\].pid,'SIGSTOP'\)/);
  assert.match(smoke, /expiryStopsTermResistantJava = true/);
  assert.match(file('provider-init.sh'), /run_greenmail.sh &/);
  assert.match(file('provider-init.sh'), /wait "\$child"/);
});
