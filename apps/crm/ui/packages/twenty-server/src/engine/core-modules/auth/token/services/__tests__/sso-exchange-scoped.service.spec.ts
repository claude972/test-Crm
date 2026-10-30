import { createHash, randomUUID } from 'node:crypto';
import { SsoExchangeTokenService } from 'src/engine/core-modules/auth/token/services/sso-exchange-token.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
jest.mock('src/engine/core-modules/app-token/app-token.entity', () => ({
  AppTokenEntity: class {},
  AppTokenType: { SsoExchangeToken: 'SSO_EXCHANGE' },
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
type Row = {
  id: string;
  value: string;
  userId: string;
  workspaceId?: string;
  context: { authProvider: AuthProviderEnum };
  expiresAt: Date;
  revokedAt?: Date | null;
  deletedAt?: Date | null;
};
const setup = () => {
  const rows = new Map<string, Row>();
  const repository = {
    create: (row: Omit<Row, 'id'>) => ({ id: randomUUID(), ...row }),
    save: jest.fn(async (row: Row) => {
      rows.set(row.id, row);
      return row;
    }),
    findOneBy: jest.fn(async ({ value }: { value: string }) => {
      const row = [...rows.values()].find(
        (item) => item.value === value && !item.revokedAt && !item.deletedAt,
      );
      return row ? { ...row } : null;
    }),
    delete: jest.fn(async ({ id }: { id: string }) => ({
      affected: rows.delete(id) ? 1 : 0,
    })),
  };
  const service = new SsoExchangeTokenService(
    repository as never,
    { get: () => '5m' } as never,
  );
  return { service, repository, rows };
};
describe('native opaque SSO exchange workspace proof', () => {
  it('stores only a hash and preserves the trusted IdP workspace without a new token store', async () => {
    const { service, rows } = setup();
    const userId = randomUUID(),
      workspaceId = randomUUID();
    const token = await service.generateSsoExchangeToken({
      userId,
      workspaceId,
      authProvider: AuthProviderEnum.SSO,
    });
    expect([...rows.values()][0]).toMatchObject({
      userId,
      workspaceId,
      value: createHash('sha256').update(token.token).digest('hex'),
    });
    expect(JSON.stringify([...rows.values()])).not.toContain(token.token);
    expect(
      await service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
    ).toEqual({ userId, workspaceId, authProvider: AuthProviderEnum.SSO });
    await expect(
      service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
    ).rejects.toThrow('Invalid SSO exchange token');
  });
  it('retains the original global SSO exchange shape when no workspace was authenticated', async () => {
    const { service } = setup();
    const userId = randomUUID();
    const token = await service.generateSsoExchangeToken({
      userId,
      authProvider: AuthProviderEnum.Google,
    });
    expect(
      await service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
    ).toEqual({ userId, authProvider: AuthProviderEnum.Google });
  });
  it('claims the native opaque token at most once under concurrent redemption', async () => {
    const { service } = setup();
    const token = await service.generateSsoExchangeToken({
      userId: randomUUID(),
      workspaceId: randomUUID(),
      authProvider: AuthProviderEnum.SSO,
    });
    const results = await Promise.allSettled([
      service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
      service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });
  it.each(['expired', 'provider', 'revoked'] as const)(
    'rejects an %s proof',
    async (state) => {
      const { service, rows } = setup();
      const token = await service.generateSsoExchangeToken({
        userId: randomUUID(),
        authProvider: AuthProviderEnum.SSO,
      });
      const row = [...rows.values()][0];
      if (state === 'expired') row.expiresAt = new Date(Date.now() - 1);
      if (state === 'provider') row.context.authProvider = 'UNKNOWN' as never;
      if (state === 'revoked') row.revokedAt = new Date();
      await expect(
        service.validateAndConsumeSsoExchangeTokenOrThrow(token.token),
      ).rejects.toThrow('Invalid SSO exchange token');
    },
  );
});
