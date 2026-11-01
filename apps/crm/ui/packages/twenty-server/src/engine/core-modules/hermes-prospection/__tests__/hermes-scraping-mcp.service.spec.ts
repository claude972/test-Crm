import { ForbiddenException } from '@nestjs/common';
import { HermesScrapingMcpService } from '../hermes-scraping-mcp.service';
import { ApiKeyEntity } from 'src/engine/core-modules/api-key/api-key.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
jest.mock('../hermes-prospection.service', () => ({
  HermesProspectionService: class {},
}));

const workspaceId = '11111111-1111-4111-8111-111111111111';
const ownerUserWorkspaceId = '22222222-2222-4222-8222-222222222222';
const apiKeyId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const input = {
  externalBatchId: 'bot-batch-1',
  name: 'Artisans',
  sourceUrl: 'https://example.test',
  collectedAt: '2026-11-01T12:00:00Z',
  originalRequest: 'Artisans de Martinique',
  ownerUserWorkspaceId,
  rows: [
    {
      email: 'a@example.test',
      companyName: 'Artisan',
      category: 'Bâtiment',
      linkedIn: 'https://linkedin.com/company/example',
    },
  ],
};
const setup = () => {
  const keys = {
    findOneBy: jest
      .fn()
      .mockResolvedValue({
        id: apiKeyId,
        workspaceId,
        expiresAt: new Date(Date.now() + 60000),
      }),
  };
  const roles = {
    findOne: jest
      .fn()
      .mockResolvedValue({
        role: {
          workspaceId,
          canUpdateAllSettings: true,
          canReadAllObjectRecords: true,
          canUpdateAllObjectRecords: true,
          fieldPermissions: [],
          rowLevelPermissionPredicates: [],
          rowLevelPermissionPredicateGroups: [],
        },
      }),
  };
  const members = {
    findOneBy: jest
      .fn()
      .mockResolvedValue({ id: ownerUserWorkspaceId, workspaceId, userId }),
  };
  const source = {
    getRepository: (entity: unknown) =>
      entity === ApiKeyEntity
        ? keys
        : entity === RoleTargetEntity
          ? roles
          : entity === UserWorkspaceEntity
            ? members
            : undefined,
  };
  const access = { assertAllowed: jest.fn().mockResolvedValue(undefined) };
  const prospection = {
    createBatch: jest
      .fn()
      .mockResolvedValue({ batch: { id: 'saved' }, replay: false }),
    list: jest.fn().mockResolvedValue({ batches: [] }),
  };
  const service = new HermesScrapingMcpService(
    source as never,
    prospection as never,
    access as never,
  );
  const deposit = service.tools(workspaceId, apiKeyId).deposit_scraped_prospects
    .execute as unknown as (value: unknown) => Promise<unknown>;
  return { keys, roles, members, prospection, access, deposit };
};
describe('MCP scraping reception', () => {
  it('uses the authenticated key workspace, validated owner, and original request', async () => {
    const { deposit, prospection, members } = setup();
    await deposit(input);
    expect(members.findOneBy).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId, id: ownerUserWorkspaceId }),
    );
    expect(prospection.createBatch).toHaveBeenCalledWith(
      { workspaceId, userWorkspaceId: ownerUserWorkspaceId, userId },
      expect.objectContaining({
        originalRequest: input.originalRequest,
        rows: input.rows,
      }),
      expect.objectContaining({ apiKeyId, assertLive: expect.any(Function) }),
    );
  });
  it('rejects caller-selected workspaces and unparseable dates before writes', async () => {
    const { deposit, prospection } = setup();
    await expect(deposit({ ...input, workspaceId })).rejects.toThrow();
    await expect(
      deposit({ ...input, collectedAt: 'yesterday' }),
    ).rejects.toThrow();
    expect(prospection.createBatch).not.toHaveBeenCalled();
  });
  it('rejects expired or revoked keys before reading or writing prospect data', async () => {
    const { deposit, keys, prospection } = setup();
    keys.findOneBy.mockResolvedValueOnce(null);
    await expect(deposit(input)).rejects.toThrow(ForbiddenException);
    keys.findOneBy.mockResolvedValueOnce({ expiresAt: new Date(0) });
    await expect(deposit(input)).rejects.toThrow(ForbiddenException);
    expect(prospection.createBatch).not.toHaveBeenCalled();
  });
  it('rejects restricted roles and owners outside the workspace', async () => {
    const { deposit, roles, members, prospection } = setup();
    roles.findOne.mockResolvedValueOnce({
      role: { workspaceId, canUpdateAllSettings: false },
    });
    await expect(deposit(input)).rejects.toThrow(ForbiddenException);
    members.findOneBy.mockResolvedValueOnce(null);
    await expect(deposit(input)).rejects.toThrow(ForbiddenException);
    expect(prospection.createBatch).not.toHaveBeenCalled();
  });
  it('rechecks the same key during the import transaction', async () => {
    const { deposit, keys, prospection } = setup();
    await deposit(input);
    const scope = prospection.createBatch.mock.calls[0][2];
    keys.findOneBy.mockResolvedValueOnce(null);
    await expect(scope.assertLive()).rejects.toThrow(ForbiddenException);
  });
});
