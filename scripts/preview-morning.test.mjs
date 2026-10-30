import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('morning lifetime accepts only 60/90 before network or processes; valid/default reach metadata fetch', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'p0-morning-test-'));
  // Any attempted metadata fetch is intercepted before directory/process setup.
  const preload = 'globalThis.fetch=async()=>{console.info("P0_TEST_METADATA_FETCH");throw new Error("fixture stop")};';
  const loader = `data:text/javascript,${encodeURIComponent(preload)}`;
  try {
    for (const value of ['0', '1', '61', '91', '360', '-60', '60.0', ' 90', '90 ', '', 'NaN', undefined, '60', '90']) {
      const env = {
        PATH: process.env.PATH, GITHUB_ACTIONS: 'true', RUNNER_TEMP: directory,
        GITHUB_ENV: path.join(directory, 'github-env'), GITHUB_REPOSITORY: 'fixture/preview',
        GITHUB_TOKEN: 'fixture-metadata-token', P0_ORIGIN_SECRET: randomBytes(32).toString('hex'),
        ...(value === undefined ? {} : { P0_PREVIEW_SESSION_MINUTES: value }),
      };
      const result = spawnSync(process.execPath, ['--import', loader, 'scripts/preview-ci-session-p0.mjs', 'start'], { env, encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, 1, `fixture ${value}`);
      const valid = value === undefined || value === '60' || value === '90';
      assert.equal(result.stdout.includes('P0_TEST_METADATA_FETCH'), valid, `strict duration validation: ${value}`);
      assert.equal(result.stdout.includes(env.P0_ORIGIN_SECRET), false);
      assert.equal(result.stderr.includes(env.P0_ORIGIN_SECRET), false);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
