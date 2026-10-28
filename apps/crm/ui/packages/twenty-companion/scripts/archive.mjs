import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import './package.mjs';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const outputDirectory = resolve(
  process.env.KOVAALAB_COMPANION_OUTPUT_DIR ?? 'release',
);
const archive = resolve(outputDirectory, `KovaaLab CRM-${version}-macos-arm64.zip`);
execFileSync('ditto', [
  '-c',
  '-k',
  '--sequesterRsrc',
  '--keepParent',
  resolve(outputDirectory, 'KovaaLab CRM-darwin-arm64/KovaaLab CRM.app'),
  archive,
]);
const checksum = createHash('sha256');
for await (const chunk of createReadStream(archive)) checksum.update(chunk);
await writeFile(
  `${archive}.sha256`,
  `${checksum.digest('hex')}  ${basename(archive)}\n`,
);
console.log(archive);
