import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isDefined } from 'kovaa-lab-shared/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { type CliWarning } from '@/output/types/cli-warning.type';
import { resolveTarget } from '@/target/resolve-target';

const CONFIG = {
  version: 1,
  defaultRemote: 'prod',
  remotes: {
    prod: { apiUrl: 'https://acme.kovaa-lab.com/', apiKey: 'prod-key' },
    staging: {
      apiUrl: 'https://staging.kovaa-lab.com',
      apiKey: 'staging-key',
      kovaa-labCLIAccessToken: 'staging-access-token',
    },
    signedOut: { apiUrl: 'https://old.kovaa-lab.com' },
  },
};

describe('resolveTarget', () => {
  let configPath: string;
  let warnings: CliWarning[];

  const resolve = (
    environment: NodeJS.ProcessEnv,
    remoteFlag?: string,
    path = configPath,
  ) =>
    resolveTarget({
      environment,
      remoteFlag,
      configPath: path,
      signal: new AbortController().signal,
      warn: (warning) => warnings.push(warning),
    });

  beforeEach(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kovaa-lab-cli-target-'));

    configPath = join(directory, 'config.json');
    warnings = [];
    await writeFile(configPath, JSON.stringify(CONFIG));
  });

  it('uses the environment pair without reading the config', async () => {
    await writeFile(configPath, '{ broken');

    await expect(
      resolve({
        KOVAALAB_API_URL: 'https://Acme.KovaaLab CRM.com/crm/',
        KOVAALAB_API_KEY: 'secret',
      }),
    ).resolves.toEqual({
      apiUrl: 'https://acme.kovaa-lab.com/crm',
      bearerToken: 'secret',
      credentialKind: 'apiKey',
      source: 'environment',
    });
  });

  it('falls back to the saved default remote', async () => {
    await expect(resolve({})).resolves.toEqual({
      apiUrl: 'https://acme.kovaa-lab.com',
      bearerToken: 'prod-key',
      credentialKind: 'apiKey',
      source: 'remote',
      remoteName: 'prod',
    });
  });

  it('selects a remote with KOVAALAB_REMOTE', async () => {
    await expect(resolve({ KOVAALAB_REMOTE: 'staging' })).resolves.toMatchObject({
      remoteName: 'staging',
    });
  });

  it('prefers a saved OAuth access token over an API key, like kovaa-lab-sdk', async () => {
    await expect(resolve({}, 'staging')).resolves.toMatchObject({
      bearerToken: 'staging-access-token',
      credentialKind: 'oauth',
    });
  });

  it('lets --remote win over the environment and says so', async () => {
    await expect(
      resolve(
        { KOVAALAB_API_URL: 'https://other.example.com', KOVAALAB_API_KEY: 'k' },
        'staging',
      ),
    ).resolves.toMatchObject({ remoteName: 'staging' });
    expect(warnings).toEqual([
      {
        code: 'ENVIRONMENT_TARGET_IGNORED',
        message:
          'Using remote staging. Ignoring KOVAALAB_API_URL and KOVAALAB_API_KEY.',
      },
    ]);
  });

  it.each([
    [{}, undefined, 'TARGET_REQUIRED', 2, 'missing.json'],
    [
      { KOVAALAB_API_URL: ' ', KOVAALAB_API_KEY: '' },
      undefined,
      'TARGET_REQUIRED',
      2,
      'missing.json',
    ],
    [
      { KOVAALAB_API_URL: 'https://acme.kovaa-lab.com' },
      undefined,
      'INCOMPLETE_TARGET',
      2,
      undefined,
    ],
    [
      { KOVAALAB_REMOTE: 'prod', KOVAALAB_API_KEY: 'k' },
      undefined,
      'CONFLICTING_TARGET',
      2,
      undefined,
    ],
    [{}, 'nope', 'UNKNOWN_REMOTE', 2, undefined],
    [{}, 'signedOut', 'AUTH_REQUIRED', 3, undefined],
    [
      { KOVAALAB_API_URL: 'acme.kovaa-lab.com', KOVAALAB_API_KEY: 'k' },
      undefined,
      'INVALID_API_URL',
      2,
      undefined,
    ],
    [
      {
        KOVAALAB_API_URL: 'https://user:pw@acme.kovaa-lab.com',
        KOVAALAB_API_KEY: 'k',
      },
      undefined,
      'INVALID_API_URL',
      2,
      undefined,
    ],
    [
      { KOVAALAB_API_URL: 'https://acme.kovaa-lab.com?x=1', KOVAALAB_API_KEY: 'k' },
      undefined,
      'INVALID_API_URL',
      2,
      undefined,
    ],
  ] as const)(
    'fails for %j with --remote %s as %s',
    async (environment, remoteFlag, code, exitCode, configFileName) => {
      const path = isDefined(configFileName)
        ? join(configPath, '..', configFileName)
        : configPath;

      await expect(
        resolve(environment, remoteFlag, path),
      ).rejects.toMatchObject({ code, exitCode });
    },
  );
});
