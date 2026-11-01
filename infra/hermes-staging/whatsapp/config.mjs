import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, realpathSync, renameSync, rmSync, chmodSync } from 'node:fs';
import path from 'node:path';
export const IMAGES = Object.freeze({
  evolution: 'evoapicloud/evolution-api:v2.3.6@sha256:9140066a0b6410e562100a96519e55ed3b61b74103bb993f9b7feff7a2e24308',
  caddy: 'caddy:2.11.7-alpine@sha256:04913b1da43339a40ad1ea87827d70a576ac5aa6cf674c6e24fdca675887533a',
  postgres: 'postgres:16-bookworm@sha256:e8a07d2c7579b038938cdba6c539e580e5001caf9ea203d397b5cc83e76bd938',
  redis: 'redis:7-bookworm@sha256:b6b6e3dc0c0952737748e55d5d885272840c7e42ba41ab1d5489f693419882f5',
  node: 'node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c',
});
export const VERSION = '2.3.6';
export function planFor(environment) {
  assert.ok([undefined, 'false', 'true'].includes(environment.KOVAALABCRM_WA_ENABLED));
  if (environment.KOVAALABCRM_WA_ENABLED !== 'true') return null;
  const id = environment.KOVAALABCRM_WA_ID;
  assert.match(id ?? '', /^[a-z][a-z0-9-]{2,27}[a-z0-9]$/);
  const hostname = `evolution-kovaalabcrm-${id}.test`;
  return { mode: 'real-whatsapp-unpaired', id, hostname, baseUrl: `https://${hostname}:8443`, instanceName: `kovaalabcrm_${id.replaceAll('-', '_')}`, expectedVersion: VERSION, certificateDays: 90 };
}
const present = (file) => { try { lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
export function prepare(directory, environment) {
  const plan = planFor(environment); assert.ok(plan, 'Explicit WA opt-in required');
  assert.ok(path.isAbsolute(directory ?? ''));
  const parent = realpathSync(path.dirname(directory));
  const checkout = realpathSync(new URL('../../../', import.meta.url));
  assert.ok(parent !== checkout && !parent.startsWith(`${checkout}${path.sep}`));
  // Check dependencies before creating any private target or partial configuration.
  execFileSync('openssl', ['version'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 });
  assert.equal(present(directory), false, 'Existing target is never reset');
  const lock = path.join(parent, `.${path.basename(directory)}.prepare-lock`);
  mkdirSync(lock, { mode: 0o700 });
  let stage;
  try {
    assert.equal(present(directory), false);
    stage = mkdtempSync(path.join(parent, '.kovaalabcrm-wa-prepare-')); chmodSync(stage, 0o700);
    const write = (name, value) => writeFileSync(path.join(stage, name), value, { mode: 0o600, flag: 'wx' });
    const secret = () => randomBytes(32).toString('hex');
    const credentials = { globalKey: secret(), instanceToken: secret(), webhookSecret: secret(), postgresPassword: secret(), redisPassword: secret() };
    write('plan.json', JSON.stringify(plan)); write('credentials.json', JSON.stringify(credentials));
    write('operator.json', JSON.stringify({ globalKey: credentials.globalKey, instanceToken: credentials.instanceToken, webhookSecret: credentials.webhookSecret }));
    write('provisioner.env', `HERMES_EVOLUTION_PROVISIONER_BASE_URL=${plan.baseUrl}\nHERMES_EVOLUTION_PROVISIONER_API_KEY=${credentials.globalKey}\n`);
    const openssl = (args) => execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '365', '-keyout', `${stage}/ca.key`, '-out', `${stage}/ca.pem`, '-subj', '/CN=kovaalabcrm private WA CA', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
    openssl(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${stage}/server.key`, '-out', `${stage}/server.csr`, '-subj', `/CN=${plan.hostname}`]);
    write('server.ext', `subjectAltName=DNS:${plan.hostname}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`);
    openssl(['x509', '-req', '-in', `${stage}/server.csr`, '-CA', `${stage}/ca.pem`, '-CAkey', `${stage}/ca.key`, '-set_serial', `0x${randomBytes(16).toString('hex')}`, '-out', `${stage}/server.pem`, '-days', '90', '-extfile', `${stage}/server.ext`]);
    for (const name of ['ca.key', 'server.key', 'server.csr', 'server.pem']) chmodSync(`${stage}/${name}`, 0o600);
    chmodSync(`${stage}/ca.pem`, 0o644);
    write('postgres.env', `POSTGRES_DB=kovaalabcrm_wa\nPOSTGRES_USER=kovaalabcrm_wa\nPOSTGRES_PASSWORD=${credentials.postgresPassword}\n`);
    write('redis.env', `REDIS_PASSWORD=${credentials.redisPassword}\n`);
    const values = {
      SERVER_TYPE: 'http', SERVER_PORT: '8080', SERVER_URL: plan.baseUrl, DOCKER_ENV: 'true',
      DATABASE_PROVIDER: 'postgresql', DATABASE_CONNECTION_URI: `postgresql://kovaalabcrm_wa:${credentials.postgresPassword}@wa-db:5432/kovaalabcrm_wa`,
      DATABASE_CONNECTION_CLIENT_NAME: 'kovaalabcrm_wa', DATABASE_SAVE_DATA_INSTANCE: 'true', DATABASE_SAVE_DATA_NEW_MESSAGE: 'true', DATABASE_SAVE_MESSAGE_UPDATE: 'true', DATABASE_SAVE_DATA_CONTACTS: 'false', DATABASE_SAVE_DATA_CHATS: 'false', DATABASE_SAVE_DATA_LABELS: 'false', DATABASE_SAVE_DATA_HISTORIC: 'false',
      CACHE_REDIS_ENABLED: 'true', CACHE_REDIS_URI: `redis://:${credentials.redisPassword}@wa-redis:6379/0`, CACHE_REDIS_PREFIX_KEY: 'kovaalabcrm_wa', CACHE_REDIS_SAVE_INSTANCES: 'false', CACHE_LOCAL_ENABLED: 'false',
      AUTHENTICATION_API_KEY: credentials.globalKey, AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: 'false',
      WEBHOOK_GLOBAL_ENABLED: 'false', WEBHOOK_EVENTS_ERRORS: 'false', WEBHOOK_EVENTS_ERRORS_WEBHOOK: '',
      LOG_LEVEL: 'ERROR,WARN', LOG_COLOR: 'false', TELEMETRY_ENABLED: 'false', SENTRY_DSN: '',
      RABBITMQ_ENABLED: 'false', WEBSOCKET_ENABLED: 'false', SQS_ENABLED: 'false', NATS_ENABLED: 'false', KAFKA_ENABLED: 'false', CHATWOOT_ENABLED: 'false', TYPEBOT_ENABLED: 'false', OPENAI_ENABLED: 'false', DIFY_ENABLED: 'false', N8N_ENABLED: 'false', FLOWISE_ENABLED: 'false', S3_ENABLED: 'false',
      CONFIG_SESSION_PHONE_CLIENT: 'kovaalabcrm', CONFIG_SESSION_PHONE_NAME: 'Chrome',
    };
    write('provider.env', Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
    write('Caddyfile', `{\n admin off\n auto_https off\n log {\n  output discard\n }\n}\nhttps://${plan.hostname}:8443 {\n tls /wa-tls/server.pem /wa-tls/server.key\n reverse_proxy wa-api:8080\n}\n`);
    // Only public CA bytes enter the CRM trust bundle; the private root key stays with the operator.
    write('application-host.env.example', `OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS=["${plan.hostname}"]\nNODE_EXTRA_CA_CERTS=/opt/kovaalabcrm-trust/extra-ca.pem\n`);
    assert.equal(present(directory), false);
    renameSync(stage, directory); stage = undefined;
    return plan;
  } finally { if (stage) rmSync(stage, { recursive: true, force: true }); rmSync(lock, { recursive: true, force: true }); }
}
export function readPlan(directory) {
  const plan = JSON.parse(readFileSync(path.join(directory, 'plan.json'), 'utf8'));
  assert.deepEqual(plan, planFor({ KOVAALABCRM_WA_ENABLED: 'true', KOVAALABCRM_WA_ID: plan.id }));
  return plan;
}
