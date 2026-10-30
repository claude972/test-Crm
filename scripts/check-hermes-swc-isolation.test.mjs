import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { loadSource } from './check-hermes-migration-ci.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromWorkspace = createRequire(path.join(root, 'apps/crm/ui/package.json'));

test('compiles migration fixtures without inheriting ambient SWC plugins', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'hermes-swc-isolation-'));
  try {
    writeFileSync(path.join(directory, '.swcrc'), JSON.stringify({
      jsc: { experimental: { plugins: [['missing-hermes-plugin-regression', {}]] } },
    }));
    const filename = path.join(directory, 'fixture.ts');
    writeFileSync(filename, 'export const fixtureValue: number = 42;');
    const compiled = loadSource(requireFromWorkspace, filename, {});
    assert.equal(compiled.fixtureValue, 42);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
