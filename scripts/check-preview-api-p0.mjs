import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { publicOrigin } from './preview-prepare.mjs';

const origin = publicOrigin(process.argv[2], 'vercel.app');

// Use the account's authenticated CLI without changing deployment protection.
async function request(route) {
  assert.ok(route.startsWith('/') && !route.startsWith('//'));
  const result = await new Promise((resolve, reject) => {
    const child = spawn('vercel', ['curl', route, '--deployment', origin,
      '--scope', 'brafas-projects', '--', '--silent', '--show-error',
      '--max-time', '40', '--write-out', '\n%{http_code}'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.resume();
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) reject(new Error(`Authenticated preview request failed: ${route}`));
      else resolve(stdout);
    });
  });
  const separator = result.lastIndexOf('\n');
  assert.equal(result.slice(separator + 1).trim(), '200', `Expected HTTP 200 for ${route}`);
  return result.slice(0, separator);
}

const health = JSON.parse(await request('/healthz'));
assert.equal(health.status, 'ok');
const config = JSON.parse(await request('/client-config?v=p0-online'));
assert.equal(typeof config.allowRequestsToKovaaLabCRMIcons, 'boolean');
assert.equal(Object.hasOwn(config, 'allowRequestsToTwentyIcons'), false);
const html = await request('/');
assert.match(html, /window\._env_\s*=\s*\{\s*REACT_APP_SERVER_BASE_URL:\s*""\s*\}/);
assert.match(html, /manifest\.json/);
const manifest = JSON.parse(await request('/manifest.json'));
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.name && manifest.start_url);
const icon = manifest.icons.find((value) => value.sizes === '192x192');
assert.ok(icon && typeof icon.src === 'string');
const iconUrl = new URL(icon.src, `${origin}/`);
assert.equal(iconUrl.origin, origin);
await request(iconUrl.pathname);
console.info(JSON.stringify({ origin, health: 'ok', clientConfig: 'ok',
  runtime: 'same-origin', manifest: 'standalone', icon192: 'reachable',
  offline: 'not asserted', authenticatedCrud: 'not asserted' }));
