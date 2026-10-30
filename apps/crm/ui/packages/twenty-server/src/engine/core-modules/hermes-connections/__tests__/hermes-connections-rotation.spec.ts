import { type Repository } from 'typeorm';

import { ColumnRotationSiteHandler } from 'src/database/commands/secret-encryption-rotation/handlers/column-rotation-site.handler';
import { SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES } from 'src/database/commands/secret-encryption-rotation/constants/secret-encryption-rotation-site-entries.constant';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type EnvironmentConfigDriver } from 'src/engine/core-modules/twenty-config/drivers/environment-config.driver';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { computeEncryptionKeyId } from 'src/engine/core-modules/secret-encryption/utils/compute-encryption-key-id.util';

import { HermesConnectionEntity } from '../hermes-connection.entity';

describe('native connection secret rotation', () => {
  it('registers workspace-scoped encrypted configuration', () => {
    expect(
      SECRET_ENCRYPTION_ROTATION_SITE_ENTRIES.HermesConnectionEntity,
    ).toMatchObject({
      entity: HermesConnectionEntity,
      columnSiteNames: {
        configuration: {
          isWorkspaceScoped: true,
          siteName: 'hermes-connection-configuration',
          customHandler: undefined,
        },
      },
    });
  });

  it('rotates native envelopes through the generic handler and preserves workspace AAD', async () => {
    let primary = 'old-unit-only-encryption-key';
    let fallback: string | null = null;
    const encryption = new SecretEncryptionService({
      get: (key: string) =>
        key === 'ENCRYPTION_KEY'
          ? primary
          : key === 'FALLBACK_ENCRYPTION_KEY'
            ? fallback
            : undefined,
    } as unknown as EnvironmentConfigDriver);
    const row = {
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      configuration: encryption.encryptVersioned(
        'synthetic-secret' as PlaintextString,
        { workspaceId: '00000000-0000-4000-8000-000000000002' },
      ),
    };
    const original = row.configuration;
    fallback = primary;
    primary = 'new-unit-only-encryption-key';
    let values: Partial<typeof row> = {};
    let pages = 0;
    const builder = {
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => (pages++ === 0 ? [row] : [])),
      update: jest.fn().mockReturnThis(),
      set: jest.fn(function (this: unknown, update: Partial<typeof row>) {
        values = update;
        return this;
      }),
      execute: jest.fn(async () => {
        Object.assign(row, values);
        return { affected: 1 };
      }),
    };
    const repository = {
      createQueryBuilder: () => builder,
    } as unknown as Repository<typeof row>;
    const handler = new ColumnRotationSiteHandler(
      { repository, encryptedColumn: 'configuration', isWorkspaceScoped: true },
      encryption,
    );
    expect(
      await handler.rotate({
        siteName: 'hermes-connection-configuration',
        currentEncryptionKeyId: computeEncryptionKeyId({ rawKey: primary }),
        batchSize: 10,
        dryRun: false,
      }),
    ).toEqual({ rotated: 1, skipped: 0, errors: 0 });
    expect(row.configuration).not.toBe(original);
    fallback = null;
    expect(
      encryption.decryptVersionedOrThrow(row.configuration, {
        workspaceId: row.workspaceId,
      }),
    ).toBe('synthetic-secret');
    expect(() =>
      encryption.decryptVersionedOrThrow(row.configuration, {
        workspaceId: 'wrong-workspace',
      }),
    ).toThrow();
    expect(builder.andWhere).toHaveBeenCalledWith(
      '"configuration" = :currentValue',
      { currentValue: original },
    );
  });
});
