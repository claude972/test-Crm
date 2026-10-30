import { randomUUID } from 'node:crypto';
import { IsNull } from 'typeorm';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class WorkspaceEntity {},
}));
jest.mock('src/engine/core-modules/public-domain/public-domain.entity', () => ({
  PublicDomainEntity: class PublicDomainEntity {},
}));
jest.mock(
  'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service',
  () => ({ DomainServerConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
const A = randomUUID(),
  B = randomUUID();
const setup = (sameOrigin = false, multiDomain = false) => {
  const repository = {
    findOne: jest.fn().mockResolvedValue({ id: B }),
    find: jest.fn().mockResolvedValue([{ id: A }]),
  };
  const config = {
    get: (key: string) =>
      key === 'IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED'
        ? sameOrigin
        : key === 'IS_MULTIWORKSPACE_ENABLED'
          ? multiDomain
          : undefined,
  };
  const domains = {
    getFrontUrl: () => new URL('https://crm.example.test'),
    getSubdomainAndCustomDomainFromUrl: () => ({}),
  };
  const service = new WorkspaceDomainsService(
    domains as never,
    config as never,
    repository as never,
    {} as never,
  );
  return { service, repository };
};
describe('opt-in same-origin native login routing', () => {
  it.each([
    [false, false],
    [false, true],
    [true, true],
  ])(
    'preserves native origin routing when sameOrigin=%s multiDomain=%s',
    async (sameOrigin, multiDomain) => {
      const { service, repository } = setup(sameOrigin, multiDomain);
      const legacy = jest
        .spyOn(service, 'getWorkspaceByOriginOrDefaultWorkspace')
        .mockResolvedValue({ id: A } as never);
      expect(
        await service.getWorkspaceForLoginToken(
          'https://legacy.example.test',
          B,
        ),
      ).toEqual({ id: A });
      expect(legacy).toHaveBeenCalledWith('https://legacy.example.test');
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );
  it('looks up only the tenant from the verified login token on the canonical origin', async () => {
    const { service, repository } = setup(true);
    expect(
      await service.getWorkspaceForLoginToken(
        'https://crm.example.test',
        B,
        'https://crm.example.test',
      ),
    ).toEqual({ id: B });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: B, deletedAt: IsNull() },
    });
  });
  it.each(['https://evil.test', 'https://crm.example.test.evil.test', 'null'])(
    'refuses malicious body origin %s before looking up a tenant',
    async (origin) => {
      const { service, repository } = setup(true);
      await expect(
        service.getWorkspaceForLoginToken(origin, B),
      ).rejects.toThrow('Same-origin workspace access is not allowed');
      expect(repository.findOne).not.toHaveBeenCalled();
    },
  );
  it('refuses an untrusted request origin even if the GraphQL origin argument is canonical', async () => {
    const { service, repository } = setup(true);
    await expect(
      service.getWorkspaceForLoginToken(
        'https://crm.example.test',
        B,
        'https://evil.test',
      ),
    ).rejects.toThrow('Same-origin workspace access is not allowed');
    expect(repository.findOne).not.toHaveBeenCalled();
  });
  it('does not fall back to another tenant when the token tenant is gone', async () => {
    const { service, repository } = setup(true);
    repository.findOne.mockResolvedValue(null);
    expect(
      await service.getWorkspaceForLoginToken('https://crm.example.test', B),
    ).toBeUndefined();
  });
  it('keeps a stable oldest default in opt-in mode and never chooses a newly created company globally', async () => {
    const { service, repository } = setup(true);
    expect(
      await service.getWorkspaceByOriginOrDefaultWorkspace(
        'https://crm.example.test',
      ),
    ).toEqual({ id: A });
    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: ['workspaceSsoIdentityProviders'],
    });
  });
  it('uses one canonical workspace URL despite a stored custom domain', () => {
    const { service } = setup(true);
    expect(
      service.getWorkspaceUrls({
        subdomain: 'company-b',
        isCustomDomainEnabled: true,
        customDomain: 'other.example.test',
      }),
    ).toEqual({
      customUrl: undefined,
      subdomainUrl: 'https://crm.example.test/',
    });
  });
});
