import assert from 'node:assert/strict';
import { request } from 'node:https';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
export const PROVIDER_CODES = Object.freeze(['ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'CERT_HAS_EXPIRED', 'ERR_SSL_WRONG_VERSION_NUMBER', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'EPROTO', 'EACCES', 'ENOENT', 'ERR_ASSERTION', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND']);
export const PROVIDER_CATEGORIES = Object.freeze(['transport', 'http-status', 'invalid-json', 'response-limit', 'timeout', 'client-validation', 'version-mismatch']);
export function providerError(category, options = {}) {
  const error = new Error('Provider request refused; private details withheld');
  error.providerDiagnostic = { category: PROVIDER_CATEGORIES.includes(category) ? category : 'transport' };
  if (PROVIDER_CODES.includes(options.code)) error.providerDiagnostic.code = options.code;
  if (Number.isInteger(options.httpStatus) && options.httpStatus >= 100 && options.httpStatus <= 599) error.providerDiagnostic.httpStatus = options.httpStatus;
  return error;
}
export function safeReadiness(value) {
  if (!value || !['private-files', 'https-request', 'version'].includes(value.phase)) return undefined;
  const result = { phase: value.phase };
  if (PROVIDER_CATEGORIES.includes(value.category)) result.category = value.category;
  if (PROVIDER_CODES.includes(value.code)) result.code = value.code;
  if (Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599) result.httpStatus = value.httpStatus;
  if (typeof value.version === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[A-Za-z0-9.-]{1,32})?$/.test(value.version)) result.version = value.version;
  if (typeof value.success === 'boolean') result.success = value.success;
  return result;
}
export function providerRequest(plan, apiKey, method, route, body, options = {}) {
  assert.match(plan.baseUrl, /^https:\/\/evolution-kovaalabcrm-[a-z0-9-]+\.test:8443$/);
  assert.match(apiKey ?? '', /^[a-f0-9]{64}$/);
  assert.ok(['GET', 'POST'].includes(method));
  assert.match(route, /^\/[A-Za-z0-9_/?=&.-]*$/);
  const target = new URL(route, plan.baseUrl);
  assert.equal(target.origin, plan.baseUrl); assert.ok(!route.startsWith('//'));
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  assert.ok(!serialized || Buffer.byteLength(serialized) < 16384);
  return new Promise((resolve, reject) => {
    const outgoing = request(target, { method, ca: options.ca, rejectUnauthorized: true, servername: options.servername ?? plan.hostname, headers: { apikey: apiKey, ...(serialized ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(serialized) } : {}) } }, (response) => {
      let bytes = 0; const chunks = [];
      response.on('data', (chunk) => { bytes += chunk.length; if (bytes > 2 * 1024 * 1024) outgoing.destroy(providerError('response-limit')); else chunks.push(chunk); });
      response.once('error', (error) => reject(providerError('transport', { code: error.code, httpStatus: response.statusCode })));
      response.once('end', () => {
        if (!(response.statusCode >= 200 && response.statusCode < 300)) { reject(providerError('http-status', { httpStatus: response.statusCode })); return; }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(providerError('invalid-json', { httpStatus: response.statusCode })); }
      });
    });
    outgoing.setTimeout(10000, () => outgoing.destroy(providerError('timeout')));
    outgoing.once('error', (error) => reject(error.providerDiagnostic ? error : providerError('transport', { code: error.code })));
    outgoing.end(serialized);
  });
}
export function newInstancePayload(plan, token) {
  assert.match(token, /^[a-f0-9]{64}$/);
  return { instanceName: plan.instanceName, token, integration: 'WHATSAPP-BAILEYS', qrcode: false, syncFullHistory: false, readMessages: false, readStatus: false, alwaysOnline: false, groupsIgnore: true, rejectCall: false };
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
