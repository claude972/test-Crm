import assert from 'node:assert/strict';
import { cp, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function publicOrigin(value, suffix) {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:');
  assert.ok(url.hostname.endsWith(`.${suffix}`), `Expected an isolated ${suffix} hostname`);
  assert.ok(!url.username && !url.password && !url.port && !url.search && !url.hash);
  assert.equal(url.pathname, '/');
  return url.origin;
}

export async function createConfig(tunnelUrl) {
  const origin = publicOrigin(tunnelUrl, 'trycloudflare.com');
  const contract = await readFile(path.join(root, 'apps/crm/ui/packages/twenty-shared/src/types/ApiPath.ts'), 'utf8');
  const body = contract.match(/export enum ApiPath\s*\{([\s\S]*?)\}/)?.[1];
  assert.ok(body, 'ApiPath enum is required');
  const entries = [...body.matchAll(/^\s*\w+\s*=\s*'([^']+)',?\s*$/gm)];
  assert.ok(entries.length > 0);
  assert.equal(body.replace(/^\s*\w+\s*=\s*'([^']+)',?\s*$/gm, '').trim(), '', 'Unsupported ApiPath syntax');
  const routes = entries.map(([, prefix]) => {
    assert.match(prefix, /^[a-z.-]+$/);
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      src: `/${escaped}(/.*)?`, dest: `${origin}/${prefix}$1`,
      transforms: [{ type: 'request.headers', op: 'set', target: { key: 'x-origin-secret' }, args: '$P0_ORIGIN_SECRET', env: ['P0_ORIGIN_SECRET'] }],
      headers: { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', 'x-vercel-enable-rewrite-caching': '0' },
    };
  });
  return { version: 2, framework: null, routes: [...routes, { handle: 'filesystem' }, { src: '/(.*)', dest: '/index.html' }] };
}

async function assertBundleTree(directory) {
  for (const entry of await readdir(directory)) {
    assert.ok(!entry.startsWith('.'), 'Hidden files are forbidden in the deploy bundle');
    const filename = path.join(directory, entry);
    const stats = await lstat(filename);
    assert.ok(!stats.isSymbolicLink(), 'Symlinks are forbidden in the deploy bundle');
    if (stats.isDirectory()) await assertBundleTree(filename);
    else assert.ok(stats.isFile());
  }
}

export async function prepare(buildDirectory, outputDirectory, tunnelUrl) {
  const source = path.resolve(buildDirectory);
  const output = path.resolve(outputDirectory);
  assert.ok(source !== output && !output.startsWith(`${source}${path.sep}`), 'Use a separate empty staging directory');
  const config = await createConfig(tunnelUrl);
  await assertBundleTree(source);
  const html = await readFile(path.join(source, 'index.html'), 'utf8');
  const slot = /window\._env_\s*=\s*\{[\s\S]*?\};/g;
  assert.equal([...html.matchAll(slot)].length, 1, 'Expected exactly one runtime config slot');
  await mkdir(output, { recursive: false });
  await cp(source, output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), html.replace(slot, 'window._env_ = { REACT_APP_SERVER_BASE_URL: "" };'));
  await writeFile(path.join(output, 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`);
}

export function backendPublicEnvironment(frontendUrl) {
  const origin = publicOrigin(frontendUrl, 'vercel.app');
  return { SERVER_URL: origin, FRONTEND_URL: origin, AUTH_COOKIE_ALLOWED_ORIGINS: origin, AUTH_COOKIE_SAME_SITE: 'lax', TRUST_PROXY: 'loopback' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'prepare' && args.length === 3) await prepare(...args);
  else if (command === 'backend-env' && args.length === 1) process.stdout.write(`${JSON.stringify(backendPublicEnvironment(args[0]), null, 2)}\n`);
  else throw new Error('Usage: preview-prepare.mjs prepare <build-dir> <new-staging-dir> <https-tunnel-origin> | backend-env <https-preview.vercel.app>');
}
