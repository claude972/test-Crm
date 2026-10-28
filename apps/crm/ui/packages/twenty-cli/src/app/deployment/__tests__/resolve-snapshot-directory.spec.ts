import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveSnapshotDirectory } from '@/app/deployment/resolve-snapshot-directory';
import { type ToolingBuild } from '@/app/types/tooling-result.type';

const appPath = '/app';
const build: ToolingBuild = {
  buildId: 'build-id',
  contentHash: 'hash',
  application: {
    universalIdentifier: 'app-id',
    name: 'app',
    displayName: 'App',
  },
  manifestFormat: 'kovaa-lab-application',
  manifest: {},
  files: [],
};

describe('resolveSnapshotDirectory', () => {
  it.each(['.kovaa-lab/cli/snapshots/build-cli/files'])(
    'accepts the snapshot inside %s',
    (path) => {
      const directory = join(appPath, path);
      expect(
        resolveSnapshotDirectory({
          build: { ...build, directory },
          appPath,
        }),
      ).toBe(directory);
    },
  );
  it.each([
    '.kovaa-lab/snapshots/build-sdk/files',
    '.kovaa-lab/cli/pull-base.json',
    '.kovaa-lab/output',
    '.kovaa-lab/cli/snapshots',
    '.kovaa-lab/snapshots',
    '.kovaa-lab/cli/snapshots-other/files',
    '.kovaa-lab/cli/snapshots/../../../outside',
    '../other/.kovaa-lab/cli/snapshots/build/files',
  ])('rejects %s outside the CLI snapshot directory', (path) => {
    expect(() =>
      resolveSnapshotDirectory({
        build: { ...build, directory: join(appPath, path) },
        appPath,
      }),
    ).toThrow(expect.objectContaining({ code: 'SNAPSHOT_INVALID' }));
  });
});
