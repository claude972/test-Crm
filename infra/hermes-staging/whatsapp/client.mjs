import assert from 'node:assert/strict';
import { request } from 'node:https';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
export function providerRequest(plan, apiKey, method, route, body, options = {}) {
  assert.match(plan.baseUrl, /^https:\/\/evolution-kovaalabcrm-[a-z0-9-]+\.test:8443$/);
  assert.match(apiKey ?? '', /^[a-f0-9]{64}$/);
  assert.ok(['GET', 'POST'].includes(method));
  assert.match(route, /^\/[A-Za-z0-9_/?=&.-]*$/);
  const target = new URL(route, plan.baseUrl);
  assert.equal(target.origin, plan.baseUrl);
  assert.ok(!route.startsWith('//'));
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  assert.ok(!serialized || Buffer.byteLength(serialized) < 16384);
  return new Promise((resolve, reject) => {
    const outgoing = request(target, { method, ca: options.ca, rejectUnauthorized: true, servername: options.servername ?? plan.hostname, headers: { apikey: apiKey, ...(serialized ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(serialized) } : {}) } }, (response) => {
      let bytes = 0; const chunks = [];
      response.on('data', (chunk) => { bytes += chunk.length; if (bytes > 2 * 1024 * 1024) outgoing.destroy(new Error('Provider response bound')); else chunks.push(chunk); });
      response.once('error', reject);
      response.once('end', () => {
        try {
          assert.ok((response.statusCode ?? 0) >= 200 && response.statusCode < 300, 'Provider request refused');
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch { reject(new Error('Provider response refused')); }
      });
    });
    outgoing.setTimeout(10000, () => outgoing.destroy(new Error('Provider timeout')));
    outgoing.once('error', () => reject(new Error('Provider TLS/transport refused')));
    outgoing.end(serialized);
  });
}
export function newInstancePayload(plan, token) {
  assert.match(token, /^[a-f0-9]{64}$/);
  return { instanceName: plan.instanceName, token, integration: 'WHATSAPP-BAILEYS', qrcode: false, syncFullHistory: false, readMessages: false, readStatus: false, alwaysOnline: false, groupsIgnore: true, rejectCall: false, webhook: { enabled: false, events: [] } };
}
export function webhookPayload(plan, connectionId, webhookSecret) {
  assert.match(connectionId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  assert.match(webhookSecret, /^[a-f0-9]{64}$/);
  return { webhook: { enabled: false, url: `https://crm-recette.kovvalab.online/webhooks/hermes/evolution/${connectionId}`, headers: { 'x-hermes-evolution-token': webhookSecret }, byEvents: false, base64: false, events: ['MESSAGES_UPSERT', 'SEND_MESSAGE'] } };
}
export function savePrivateResult(file, bytes) {
  assert.ok(path.isAbsolute(file ?? '')); assert.equal(existsSync(file), false);
  const parent = realpathSync(path.dirname(file));
  const checkout = realpathSync(new URL('../../../', import.meta.url));
  assert.ok(parent !== checkout && !parent.startsWith(`${checkout}${path.sep}`));
  writeFileSync(file, bytes, { mode: 0o600, flag: 'wx' });
}
export function qrBytes(payload) {
  const value = payload.base64 ?? payload.qrcode?.base64;
  assert.match(value ?? '', /^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
  const bytes = Buffer.from(value.slice('data:image/png;base64,'.length), 'base64');
  assert.ok(bytes.length > 8 && bytes.length < 1024 * 1024);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return bytes;
}
export function readPrivateOperator(directory) {
  const values = JSON.parse(readFileSync(path.join(directory, 'operator.json'), 'utf8'));
  for (const name of ['globalKey', 'instanceToken', 'webhookSecret']) assert.match(values[name] ?? '', /^[a-f0-9]{64}$/);
  assert.equal(new Set(Object.values(values)).size, 3); return values;
}
