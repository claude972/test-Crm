import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync, realpathSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const GREENMAIL_IMAGE = 'greenmail/standalone:2.1.15@sha256:309ba544ea482e5d4265d09921cdab07c8dad2cc4481d715c9b8ff5d3f0a149f';
export const NODE_IMAGE = 'node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c';
export const NETWORK = 'kovaalabcrm-staging-mail-fixture';
export const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function fixturePlan(environment, now = Date.now()) {
  assert.ok([undefined, 'false', 'true'].includes(environment.KOVAALABCRM_MAIL_FIXTURE_ENABLED));
  if (environment.KOVAALABCRM_MAIL_FIXTURE_ENABLED !== 'true') return null;
  const id = environment.KOVAALABCRM_MAIL_FIXTURE_ID;
  assert.match(id ?? '', /^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$/);
  const expiresAt = environment.KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT ?? new Date(now + MAX_AGE).toISOString();
  const expires = Date.parse(expiresAt);
  assert.ok(Number.isFinite(expires) && expires > now && expires <= now + MAX_AGE);
  return { mode: 'isolated-capture-only', id, hostname: `mail-fixture-${id}.test`, network: NETWORK, expiresAt: new Date(expires).toISOString(), users: ['operator', 'ada', 'grace'], imaps: 3993, smtps: 3465 };
}
function privateWrite(directory, name, value) { writeFileSync(path.join(directory, name), value, { flag: 'wx', mode: 0o600 }); }
export function prepare(directory, environment, now = Date.now()) {
  const plan = fixturePlan(environment, now);
  assert.ok(plan, 'Fixture must be explicitly enabled');
  assert.ok(path.isAbsolute(directory));
  const parent = realpathSync(path.dirname(directory));
  const checkout = realpathSync(new URL('../../../', import.meta.url));
  assert.ok(parent !== checkout && !parent.startsWith(`${checkout}${path.sep}`));
  assert.equal(existsSync(directory), false, 'Refuse reset or credential replacement');
  mkdirSync(directory, { mode: 0o700 });
  const root = randomBytes(32);
  const derive = (purpose) => createHmac('sha256', root).update(`kovaalabcrm-staging-mail-v1\0${plan.id}\0${purpose}`).digest('hex');
  const credentials = Object.fromEntries(plan.users.map((user) => [user, derive(`mailbox:${user}`)]));
  const keystore = derive('keystore');
  privateWrite(directory, 'root-secret', root.toString('hex'));
  privateWrite(directory, 'credentials.json', JSON.stringify(credentials));
  privateWrite(directory, 'plan.json', JSON.stringify(plan));
  privateWrite(directory, 'keystore-password', keystore);
  const openssl = (args) => execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '7', '-keyout', path.join(directory, 'ca.key'), '-out', path.join(directory, 'ca.pem'), '-subj', '/CN=kovaalabcrm isolated test CA', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  openssl(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'server.key'), '-out', path.join(directory, 'server.csr'), '-subj', `/CN=${plan.hostname}`]);
  privateWrite(directory, 'server.ext', `subjectAltName=DNS:${plan.hostname}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`);
  openssl(['x509', '-req', '-in', path.join(directory, 'server.csr'), '-CA', path.join(directory, 'ca.pem'), '-CAkey', path.join(directory, 'ca.key'), '-CAcreateserial', '-out', path.join(directory, 'server.pem'), '-days', '7', '-extfile', path.join(directory, 'server.ext')]);
  openssl(['pkcs12', '-export', '-out', path.join(directory, 'server.p12'), '-inkey', path.join(directory, 'server.key'), '-in', path.join(directory, 'server.pem'), '-certfile', path.join(directory, 'ca.pem'), '-passout', `file:${path.join(directory, 'keystore-password')}`]);
  for (const file of ['ca.key', 'ca.srl', 'server.key', 'server.csr', 'server.pem', 'server.p12']) chmodSync(path.join(directory, file), 0o600);
  // Only the public CA is readable by the application's separate non-root UID through a file mount.
  chmodSync(path.join(directory, 'ca.pem'), 0o644);
  const users = plan.users.map((user) => `${user}:${credentials[user]}@${plan.hostname}`).join(',');
  privateWrite(directory, 'provider.env', `KOVAALABCRM_FIXTURE_NAMESPACE=${plan.id}\nGREENMAIL_OPTS=-Dgreenmail.setup.test.imaps -Dgreenmail.setup.test.smtps -Dgreenmail.hostname=0.0.0.0 -Dgreenmail.users=${users} -Dgreenmail.tls.keystore.file=/fixture/server.p12 -Dgreenmail.tls.keystore.password=${keystore}\n`);
  privateWrite(directory, 'application.env', `NODE_EXTRA_CA_CERTS=/opt/kovaalabcrm-fixture/ca.pem\nOUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS=["${plan.hostname}"]\nIMAP_SMTP_ALLOW_SELF_SIGNED=false\nOUTBOUND_HTTP_SAFE_MODE_ENABLED=true\n`);
  privateWrite(directory, 'expiry.env', `KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT=${plan.expiresAt}\nKOVAALABCRM_FIXTURE_NAMESPACE=${plan.id}\n`);
  return plan;
}
export function readPlan(directory) {
  const plan = JSON.parse(readFileSync(path.join(directory, 'plan.json'), 'utf8'));
  assert.equal(plan.mode, 'isolated-capture-only');
  const checked = fixturePlan({ KOVAALABCRM_MAIL_FIXTURE_ENABLED: 'true', KOVAALABCRM_MAIL_FIXTURE_ID: plan.id, KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT: plan.expiresAt });
  assert.deepEqual(plan, checked);
  return plan;
}
