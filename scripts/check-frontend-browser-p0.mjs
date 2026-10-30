import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Browser smoke is for the disposable cloud environment');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'apps/crm/ui/packages/twenty-front');
const indexPath = path.join(frontend, 'build/index.html');
assert.ok(existsSync(indexPath), 'A real frontend build is required');
const originalIndex = readFileSync(indexPath, 'utf8');
const runtimeConfig = /window\._env_\s*=\s*\{[\s\S]*?\};/g;
assert.equal([...originalIndex.matchAll(runtimeConfig)].length, 1, 'Expected one existing runtime configuration slot');
const require = createRequire(path.join(frontend, 'package.json'));
const { chromium } = require('playwright');
const screenshots = path.join(root, 'p0-browser-artifacts');
mkdirSync(screenshots, { recursive: true });
writeFileSync(indexPath, originalIndex.replace(runtimeConfig, 'window._env_ = { REACT_APP_SERVER_BASE_URL: "http://127.0.0.1:3000" };'));
const preview = spawn(process.execPath, ['--input-type=module', '-e', "const { preview } = await import('vite'); await preview({ preview: { host: '127.0.0.1', port: 3001, strictPort: true } });"], {
  cwd: frontend,
  env: { ...process.env, CI: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let previewLog = '';
for (const stream of [preview.stdout, preview.stderr]) stream.on('data', (data) => { previewLog = (previewLog + data).slice(-10_000); });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Preview exited: ${previewLog}`);
    try {
      const response = await fetch('http://127.0.0.1:3001/welcome', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* The preview server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, `Frontend preview timed out: ${previewLog}`);
  browser = await chromium.launch({ headless: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const failedAssets = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1:3001/') && /\.(?:js|css|woff2?)(?:\?|$)/.test(response.url()) && response.status() >= 400) {
        failedAssets.push(`${response.status()} ${response.url()}`);
      }
    });
    try {
      const configResponse = page.waitForResponse((response) => response.url().startsWith('http://127.0.0.1:3000/client-config') && response.status() === 200, { timeout: 60_000 });
      await page.goto('http://127.0.0.1:3001/welcome', { waitUntil: 'domcontentloaded' });
      await configResponse;
      const continueWithEmail = page.getByRole('button', { name: 'Continue with Email', exact: true });
      await continueWithEmail.waitFor({ state: 'visible', timeout: 60_000 });
      await page.screenshot({ path: path.join(screenshots, `${name}-welcome.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      assert.equal(overflow, false, `${name}: horizontal overflow`);
      await continueWithEmail.click();
      const email = page.getByPlaceholder('Email', { exact: true });
      await email.waitFor({ state: 'visible' });
      await email.fill('invalid-email');
      assert.equal(await email.inputValue(), 'invalid-email');
      await page.screenshot({ path: path.join(screenshots, `${name}-email.png`), fullPage: true });
      assert.deepEqual(errors, [], `${name}: uncaught browser errors`);
      assert.deepEqual(failedAssets, [], `${name}: failed script/style/font assets`);
    } catch (error) {
      await page.screenshot({ path: path.join(screenshots, `${name}-failure.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  console.info('P0 browser: real client-config, desktop/mobile welcome and email step, assets and overflow verified');
} finally {
  await browser?.close().catch(() => {});
  preview.kill('SIGTERM');
  const killTimer = setTimeout(() => preview.kill('SIGKILL'), 5000);
  killTimer.unref();
  writeFileSync(indexPath, originalIndex);
}
