import assert from 'node:assert/strict';
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { publicOrigin } from './preview-prepare.mjs';

export const SESSION_MS = 60 * 60 * 1000;

// No private env files, DNS targets, public listeners, or redirects are used.
export function createGate({ secret, backendUrl = 'http://127.0.0.1:3000', controlFile, expiresAt = Date.now() + SESSION_MS }) {
  assert.match(secret ?? '', /^[a-f0-9]{64}$/, 'Use a fresh random 32-byte hex origin secret');
  const target = new URL(backendUrl);
  assert.equal(target.protocol, 'http:');
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.pathname, '/');
  assert.ok(!target.username && !target.password && !target.search && !target.hash);
  assert.ok(expiresAt > Date.now() && expiresAt <= Date.now() + SESSION_MS);
  const expected = Buffer.from(secret);
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('CDN-Cache-Control', 'no-store');
    const candidate = Buffer.from(request.headers['x-origin-secret'] ?? '');
    if (Date.now() >= expiresAt || candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!request.url?.startsWith('/') || request.url.startsWith('//')) {
      response.writeHead(400).end('Invalid path');
      return;
    }
    let origin;
    try {
      const control = JSON.parse(readFileSync(controlFile, 'utf8'));
      origin = new URL(publicOrigin(control.frontendUrl, 'vercel.app'));
      assert.equal(publicOrigin(control.serverUrl, 'vercel.app'), origin.origin);
    } catch {
      response.writeHead(502).end('Preview public origin is not configured');
      return;
    }
    const headers = { ...request.headers, host: origin.host,
      'x-forwarded-host': origin.host, 'x-forwarded-proto': 'https', 'x-forwarded-port': '443' };
    delete headers['x-origin-secret'];
    delete headers.forwarded;
    // The public, validated control file fixes Nest's effective request origin.
    // Never trust visitor-supplied Host or forwarding values; preserve Origin
    // for Nest's existing CORS/CSRF checks, and preserve application auth/cookies.
    const upstream = http.request({
      hostname: target.hostname, port: target.port || 80,
      path: request.url, method: request.method, headers,
    }, (incoming) => {
      const outgoing = { ...incoming.headers, 'cache-control': 'private, no-store', 'cdn-cache-control': 'no-store' };
      response.writeHead(incoming.statusCode ?? 502, outgoing);
      incoming.pipe(response);
    });
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => upstream.destroy());
    request.pipe(upstream);
  });
  // Quick Tunnels cannot carry SSE. Refuse protocol upgrades explicitly.
  server.on('upgrade', (_request, socket) => socket.end('HTTP/1.1 501 Not Implemented\r\nConnection: close\r\n\r\n'));
  const timer = setTimeout(() => { server.close(); server.closeAllConnections(); }, expiresAt - Date.now());
  timer.unref();
  server.once('close', () => clearTimeout(timer));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.env.P0_PREVIEW_CONTROL_FILE, 'P0_PREVIEW_CONTROL_FILE is required');
  const gate = createGate({ secret: process.env.P0_ORIGIN_SECRET, backendUrl: process.env.P0_BACKEND_URL, controlFile: process.env.P0_PREVIEW_CONTROL_FILE });
  gate.listen(3002, '127.0.0.1', () => console.info('Preview origin gate ready on loopback; expires in 60 minutes'));
  gate.on('error', () => { console.error('Preview origin gate failed'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { gate.close(); gate.closeAllConnections(); });
}
