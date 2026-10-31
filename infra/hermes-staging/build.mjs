import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

assert.match(process.env.HERMES_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/, 'An exact source SHA is required');
const root = '/app';
assert.match(readFileSync(path.join(root, 'packages/twenty-server/src/engine/core-modules/upgrade/constants/twenty-current-version.constant.ts'), 'utf8'), /KOVAALAB_CURRENT_VERSION = '2\.52\.0'/, 'Update the packaging native version deliberately when the source changes');
const yarn = path.join(root, '.yarn/releases/yarn-4.18.1.cjs');
const command = (args, directory = root, environment = {}) => {
  const child = spawnSync(process.execPath, args, { cwd: directory, env: { ...process.env, ...environment }, stdio: 'inherit' });
  assert.ok(!child.error && child.status === 0, 'Image build command failed');
};
const requireFile = (name) => assert.ok(existsSync(path.join(root, name)), `Missing image build output: ${name}`);
command([yarn, 'install', '--immutable']);
command([yarn, 'nx', 'run-many', '--target=build', '--projects=kovaa-lab-shared,kovaa-lab-ui,kovaa-lab-front-component-renderer', '--parallel=1', '--skip-nx-cache']);
const emails = path.join(root, 'packages/twenty-emails');
command(['--input-type=module', '-e', "const { build } = await import('vite'); await build();"], emails);
command(['../../node_modules/.bin/tsgo', '-p', 'tsconfig.lib.json', '--declaration', '--emitDeclarationOnly', '--noEmit', 'false', '--outDir', 'dist', '--rootDir', 'src', '--composite', 'false', '--singleThreaded'], emails);
command(['../../node_modules/tsc-alias/dist/bin/index.js', '-p', 'tsconfig.lib.json', '--outDir', 'dist'], emails);
command([yarn, 'workspace', 'kovaa-lab-front', 'exec', 'lingui', 'compile', '--typescript']);
command(['../../node_modules/.bin/tsgo', '-p', 'tsconfig.json', '--noEmit', '--singleThreaded'], path.join(root, 'packages/twenty-front'));
const server = path.join(root, 'packages/twenty-server');
command(['../../node_modules/.bin/tsgo', '-p', 'tsconfig.build.json', '--noEmit', '--singleThreaded'], server);
command(['../../node_modules/.bin/nest', 'build', '--path', './tsconfig.build.json'], server);
const sdkAssets = path.join(server, 'dist/assets/kovaa-lab-client-sdk');
mkdirSync(sdkAssets, { recursive: true });
cpSync(path.join(root, 'packages/twenty-client-sdk/package.json'), path.join(sdkAssets, 'package.json'));
cpSync(path.join(root, 'packages/twenty-client-sdk/dist'), path.join(sdkAssets, 'dist'), { recursive: true });
command([yarn, 'workspace', 'kovaa-lab-front', 'build'], root, { REACT_APP_SERVER_BASE_URL: '' });
cpSync(path.join(root, 'packages/twenty-front/build'), path.join(server, 'dist/front'), { recursive: true });
writeFileSync(path.join(server, 'dist/front/KOVAALABCRM_SOURCE.txt'), `${process.env.HERMES_SOURCE_SHA}\n`);
for (const name of ['packages/twenty-server/dist/main.js', 'packages/twenty-server/dist/queue-worker/queue-worker.js', 'packages/twenty-server/dist/front/index.html', 'packages/twenty-server/dist/assets/kovaa-lab-client-sdk/dist/metadata/index.d.ts']) requireFile(name);
// The native constraint hook imports dev-only @yarnpkg/types, removed by production focus.
command([yarn, 'constraints']);
command([yarn, 'workspaces', 'focus', '--production', 'kovaa-lab-server', 'kovaa-lab-shared', 'kovaa-lab-emails', 'kovaa-lab-client-sdk'], root, { YARN_ENABLE_CONSTRAINTS_CHECKS: 'false' });
