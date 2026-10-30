import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { once } from 'node:events';
import { createGate, SESSION_MS, MAX_SESSION_MS, sessionExpiry } from './preview-origin-gate.mjs';
import { backendPublicEnvironment, createConfig, prepare, publicOrigin } from './preview-prepare.mjs';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = (server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });

test('real HTTP gate rejects unauthorized traffic and preserves authenticated API/cookies', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'p0-preview-gate-'));
  const controlFile = path.join(directory, 'control.json');
  let calls = 0;
  const backend = http.createServer((request, response) => {
    calls++;
    assert.equal(request.headers['x-origin-secret'], undefined);
    assert.equal(request.url, '/graphql?test=1');
    assert.equal(request.headers.authorization, 'Bearer application-token');
    assert.equal(request.headers.host, 'isolated-preview.vercel.app');
    assert.equal(request.headers['x-forwarded-host'], 'isolated-preview.vercel.app');
    assert.equal(request.headers['x-forwarded-proto'], 'https');
    assert.equal(request.headers.forwarded, undefined);
    assert.equal(request.headers.origin, 'https://isolated-preview.vercel.app');
    response.setHeader('Set-Cookie', 'session=test; Secure; HttpOnly; SameSite=Lax');
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.end('real disposable test server');
  });
  const backendUrl = await listen(backend);
  const secret = randomBytes(32).toString('hex');
  const gate = createGate({ secret, backendUrl, controlFile });
  const origin = await listen(gate);
  try {
    for (const headers of [{}, { 'x-origin-secret': 'wrong' }, { 'x-origin-secret': randomBytes(32).toString('hex') }]) {
      assert.equal((await fetch(`${origin}/graphql?test=1`, { headers })).status, 403);
    }
    assert.equal(calls, 0);
    assert.equal((await fetch(`${origin}/graphql?test=1`, { headers: { 'x-origin-secret': secret } })).status, 502);
    await writeFile(controlFile, JSON.stringify({ serverUrl: 'https://isolated-preview.vercel.app', frontendUrl: 'https://isolated-preview.vercel.app' }));
    const response = await fetch(`${origin}/graphql?test=1`, { headers: { 'x-origin-secret': secret, authorization: 'Bearer application-token', origin: 'https://isolated-preview.vercel.app', 'x-forwarded-host': 'spoof.invalid', 'x-forwarded-proto': 'http', forwarded: 'host=spoof.invalid' } });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'real disposable test server');
    assert.match(response.headers.get('set-cookie'), /Secure; HttpOnly; SameSite=Lax/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(calls, 1);
  } finally { await close(gate); await close(backend); await rm(directory, { recursive: true, force: true }); }
});

test('rejects public upstreams, excessive lifetimes, and untrusted public origins', () => {
  const secret = randomBytes(32).toString('hex');
  assert.throws(() => createGate({ secret, backendUrl: 'http://example.com' }));
  assert.throws(() => createGate({ secret, expiresAt: Date.now() + MAX_SESSION_MS + 10000 }));
  for (const value of ['http://test.vercel.app', 'https://vercel.app.evil.test', 'https://user@test.vercel.app', 'https://test.vercel.app/path']) assert.throws(() => publicOrigin(value, 'vercel.app'));
  assert.equal(backendPublicEnvironment('https://isolated-preview.vercel.app').FRONTEND_URL, 'https://isolated-preview.vercel.app');
});

test('absolute session deadline defaults to 60 minutes and is never extended by public control updates', async () => {
  const now = Date.now();
  assert.equal(sessionExpiry(undefined, now), now + SESSION_MS);
  assert.equal(sessionExpiry(new Date(now + 30_000).toISOString(), now), now + 30_000);
  for (const value of ['invalid', '123', new Date(now - 1).toISOString(), new Date(now + MAX_SESSION_MS + 1).toISOString()]) assert.throws(() => sessionExpiry(value, now));
  const directory = await mkdtemp(path.join(tmpdir(), 'p0-preview-expiry-'));
  const controlFile = path.join(directory, 'control.json');
  const gate = createGate({ secret: randomBytes(32).toString('hex'), controlFile, expiresAt: Date.now() + 150 });
  const closed = once(gate, 'close');
  try {
    await listen(gate);
    await writeFile(controlFile, JSON.stringify({ serverUrl: 'https://first.vercel.app', frontendUrl: 'https://first.vercel.app' }));
    await writeFile(controlFile, JSON.stringify({ serverUrl: 'https://second.vercel.app', frontendUrl: 'https://second.vercel.app' }));
    await closed;
    assert.equal(gate.listening, false);
    assert.ok(Date.now() - now < 2000, 'Control changes must not renew the deadline');
  } finally { if (gate.listening) await close(gate); await rm(directory, { recursive: true, force: true }); }
});

test('generates contract routes with env reference only and patches one runtime slot in copied bundle', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'p0-preview-test-'));
  try {
    const source = path.join(directory, 'build');
    const output = path.join(directory, 'staging');
    await mkdir(source);
    const html = '<script>window._env_ = { /* empty slot */ };</script><div id="root"></div>';
    await writeFile(path.join(source, 'index.html'), html);
    await prepare(source, output, 'https://disposable-test.trycloudflare.com');
    assert.equal(await readFile(path.join(source, 'index.html'), 'utf8'), html);
    assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), /REACT_APP_SERVER_BASE_URL: ""/);
    const config = await createConfig('https://disposable-test.trycloudflare.com');
    const apiRoutes = config.routes.filter((route) => route.transforms);
    assert.ok(apiRoutes.length > 15);
    assert.ok(apiRoutes.some((route) => route.src === '/graphql(/.*)?'));
    assert.ok(apiRoutes.some((route) => route.src === '/\\.well-known(/.*)?'));
    for (const route of apiRoutes) assert.equal(route.transforms[0].args, '$P0_ORIGIN_SECRET');
    assert.equal(JSON.stringify(config).includes('application-token'), false);
    await assert.rejects(prepare(source, output, 'https://disposable-test.trycloudflare.com'));
    await writeFile(path.join(source, 'index.html'), '<div>no runtime slot</div>');
    await assert.rejects(prepare(source, path.join(directory, 'invalid'), 'https://disposable-test.trycloudflare.com'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
