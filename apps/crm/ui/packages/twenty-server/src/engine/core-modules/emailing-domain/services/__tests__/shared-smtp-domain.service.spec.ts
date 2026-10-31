import { EmailingDomainService } from 'src/engine/core-modules/emailing-domain/services/emailing-domain.service';
import { UnsubscribeHostnameService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-hostname.service';
import { EmailingDomainDriverFactory } from 'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { type EmailingDomainEntity } from 'src/engine/core-modules/emailing-domain/emailing-domain.entity';

const setup = () => {
  let current = EmailingDomainDriver.SMTP;
  const rows: EmailingDomainEntity[] = [];
  const remote = {
    provisionWorkspace: jest.fn(async () => {}),
    verifyDomain: jest.fn(async () => ({
      status: 'VERIFIED',
      verificationRecords: [],
    })),
    registerDomain: jest.fn(async () => {}),
    cleanupDomain: jest.fn(async () => {}),
    deprovisionWorkspace: jest.fn(async () => {}),
  };
  const factory = Object.assign(
    Object.create(EmailingDomainDriverFactory.prototype),
    {
      kovaaLabConfigService: { get: () => current },
      getCurrentDriver: () => remote,
    },
  ) as EmailingDomainDriverFactory;
  const scoped = {
    insertAndReturnOne: jest.fn(
      async (workspaceId: string, input: Partial<EmailingDomainEntity>) => {
        if (
          rows.some(
            (row) =>
              row.domain === input.domain &&
              (input.driver !== EmailingDomainDriver.SMTP
                ? row.driver !== EmailingDomainDriver.SMTP
                : row.workspaceId === workspaceId &&
                  row.driver === input.driver),
          )
        )
          throw Object.assign(Error('unique'), { code: '23505' });
        const row = {
          id: String(rows.length + 1),
          workspaceId,
          ...input,
        } as EmailingDomainEntity;
        rows.push(row);
        return row;
      },
    ),
    update: jest.fn(
      async (
        workspaceId: string,
        where: { id: string },
        patch: Partial<EmailingDomainEntity>,
      ) => {
        Object.assign(
          rows.find(
            (row) => row.workspaceId === workspaceId && row.id === where.id,
          )!,
          patch,
        );
      },
    ),
    findOneOrFail: jest.fn(
      async (workspaceId: string, { where }: { where: { id: string } }) =>
        rows.find(
          (row) => row.workspaceId === workspaceId && row.id === where.id,
        ),
    ),
    findOne: jest.fn(
      async (
        workspaceId: string,
        { where }: { where: Partial<EmailingDomainEntity> },
      ) =>
        rows.find(
          (row) =>
            row.workspaceId === workspaceId &&
            Object.entries(where).every(
              ([key, value]) =>
                row[key as keyof EmailingDomainEntity] === value,
            ),
        ),
    ),
    delete: jest.fn(async () => {}),
  };
  const global = {
    findOne: jest.fn(
      async ({
        where,
      }: {
        where: { domain: string; driver: unknown; workspaceId?: string };
      }) =>
        rows.find(
          (row) =>
            row.domain === where.domain &&
            (typeof where.driver === 'string'
              ? row.driver === where.driver &&
                row.workspaceId === where.workspaceId
              : row.driver !== EmailingDomainDriver.SMTP),
        ),
    ),
  };
  const dns = {
    deprovision: jest.fn(async () => {}),
    sync: jest.fn(async () => {}),
    withDnsRecords: jest.fn(async (row: EmailingDomainEntity) => row),
  };
  const service = new EmailingDomainService(
    scoped as never,
    global as never,
    factory,
    dns as never,
    { withDnsRecord: jest.fn() } as never,
    {
      executeInWorkspaceContext: async (operation: () => Promise<unknown>) =>
        operation(),
      getRepository: () => ({ exists: async () => false }),
    } as never,
  );
  return {
    service,
    scoped,
    global,
    remote,
    factory,
    rows,
    dns,
    setDriver: (value: EmailingDomainDriver) => {
      current = value;
    },
  };
};

describe('persistent shared SMTP domain ownership', () => {
  it('creates distinct owned SMTP rows for A/B on one normalized domain', async () => {
    const f = setup();
    const a = await f.service.createEmailingDomain(
      ' SHARED.example.test ',
      'A',
    );
    const b = await f.service.createEmailingDomain('shared.example.test', 'B');
    expect(a).toMatchObject({
      workspaceId: 'A',
      driver: 'SMTP',
      domain: 'shared.example.test',
      status: 'VERIFIED',
    });
    expect(b.id).not.toBe(a.id);
    expect(b.workspaceId).toBe('B');
    await expect(
      f.service.createEmailingDomain('shared.example.test', 'A'),
    ).rejects.toThrow();
    expect(f.remote.verifyDomain).toHaveBeenCalledTimes(2);
  });
  it('reserves before external calls and never verifies a losing concurrent claim', async () => {
    const f = setup();
    f.remote.verifyDomain.mockImplementation(async () => {
      expect(f.rows[0].status).toBe('PENDING');
      return { status: 'VERIFIED', verificationRecords: [] };
    });
    const results = await Promise.allSettled([
      f.service.createEmailingDomain('shared.test', 'A'),
      f.service.createEmailingDomain('shared.test', 'A'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(f.rows).toHaveLength(1);
    expect(f.remote.verifyDomain).toHaveBeenCalledTimes(1);
  });
  it('preserves exclusive global cloud and legacy ownership across providers', async () => {
    const f = setup();
    f.setDriver(EmailingDomainDriver.AWS_SES);
    await f.service.createEmailingDomain('shared.test', 'A');
    f.setDriver(EmailingDomainDriver.RESEND);
    await expect(
      f.service.createEmailingDomain('shared.test', 'B'),
    ).rejects.toThrow();
    expect(f.remote.verifyDomain).toHaveBeenCalledTimes(1);
    f.rows[0].driver = 'LEGACY_GLOBAL';
    await expect(
      f.service.createEmailingDomain('shared.test', 'A'),
    ).rejects.toThrow();
    f.setDriver(EmailingDomainDriver.SMTP);
    await expect(
      f.service.createEmailingDomain('shared.test', 'B'),
    ).resolves.toMatchObject({ workspaceId: 'B', driver: 'SMTP' });
  });
  it('does not dispatch verification or cleanup through another configured provider', async () => {
    const f = setup();
    const row = await f.service.createEmailingDomain('shared.test', 'A');
    f.setDriver(EmailingDomainDriver.AWS_SES);
    f.remote.verifyDomain.mockClear();
    await expect(
      f.service.verifyEmailingDomain({
        workspaceId: 'A',
        emailingDomainId: row.id,
      }),
    ).rejects.toThrow();
    await expect(
      f.service.deleteEmailingDomain({ id: 'A' } as never, row.id),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    expect(f.remote.verifyDomain).not.toHaveBeenCalled();
    expect(f.remote.cleanupDomain).not.toHaveBeenCalled();
    expect(f.dns.deprovision).not.toHaveBeenCalled();
    expect(f.scoped.delete).not.toHaveBeenCalled();
    expect(() =>
      f.factory.getDriverForDomain({ driver: 'LEGACY_GLOBAL' }),
    ).toThrow();
  });
  it('refuses legacy cleanup jobs and validates every provenance before any side effect', async () => {
    const f = setup();
    await expect(
      f.service.cleanupEmailingDomainsForWorkspace('A', ['shared.test']),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    await expect(
      f.service.cleanupEmailingDomainsForWorkspace(
        'A',
        ['shared.test', 'other.test'],
        [
          { domain: 'shared.test', driver: EmailingDomainDriver.SMTP },
          { domain: 'other.test', driver: 'LEGACY_GLOBAL' },
        ],
      ),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    expect(f.remote.cleanupDomain).not.toHaveBeenCalled();
    expect(f.remote.deprovisionWorkspace).not.toHaveBeenCalled();
    await f.service.cleanupEmailingDomainsForWorkspace(
      'A',
      ['shared.test'],
      [{ domain: 'shared.test', driver: EmailingDomainDriver.SMTP }],
    );
    expect(f.remote.cleanupDomain).toHaveBeenCalledWith({
      workspaceId: 'A',
      domain: 'shared.test',
    });
    expect(f.remote.deprovisionWorkspace).toHaveBeenCalledWith('A');
  });
  it('keeps local ownership when remote cleanup fails and cannot read a foreign workspace ID', async () => {
    const f = setup();
    const row = await f.service.createEmailingDomain('shared.test', 'A');
    await expect(
      f.service.verifyEmailingDomain({
        workspaceId: 'B',
        emailingDomainId: row.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    f.remote.cleanupDomain.mockRejectedValueOnce(
      Error('cleanup unavailable') as never,
    );
    await expect(
      f.service.deleteEmailingDomain({ id: 'A' } as never, row.id),
    ).rejects.toThrow('cleanup unavailable');
    expect(f.scoped.delete).not.toHaveBeenCalled();
    expect(f.dns.deprovision).not.toHaveBeenCalled();
  });
  it('retries provider registration before recovering a failed reservation as verified', async () => {
    const f = setup();
    f.remote.registerDomain.mockRejectedValueOnce(
      Error('registration incomplete') as never,
    );
    await expect(
      f.service.createEmailingDomain('shared.test', 'A'),
    ).rejects.toThrow('registration incomplete');
    expect(f.rows[0].status).toBe('FAILED');
    await f.service.verifyEmailingDomain({
      workspaceId: 'A',
      emailingDomainId: f.rows[0].id,
    });
    expect(f.remote.registerDomain).toHaveBeenCalledTimes(2);
    expect(f.rows[0].status).toBe('VERIFIED');
  });
  it('retains a failed reservation without falsely marking connectivity verified', async () => {
    const f = setup();
    f.remote.verifyDomain.mockRejectedValueOnce(Error('unavailable') as never);
    await expect(
      f.service.createEmailingDomain('shared.test', 'A'),
    ).rejects.toThrow('unavailable');
    expect(f.rows[0].status).toBe('FAILED');
    expect(f.remote.registerDomain).not.toHaveBeenCalled();
  });
});

describe('SMTP unsubscribe uses the shared signed server route, never domain DNS', () => {
  it('never provisions, adopts or deletes DNS even when the manager is configured', async () => {
    const row = {
      id: 'domain',
      workspaceId: 'A',
      driver: EmailingDomainDriver.SMTP,
      domain: 'shared.test',
      unsubscribeHostname: 'links.shared.test',
    } as EmailingDomainEntity;
    const update = jest.fn(async () => {});
    const dns = {
      isConfigured: jest.fn(() => true),
      registerHostname: jest.fn(),
      deleteHostnameSilently: jest.fn(),
      isHostnameWorking: jest.fn(),
      getHostnameWithRecords: jest.fn(),
    };
    const service = new UnsubscribeHostnameService(
      { findOneOrFail: jest.fn(async () => row), update } as never,
      dns as never,
      { get: () => 'https://crm.example.test' } as never,
    );
    await service.sync('A', row.id, { provision: true });
    await service.provision(row);
    await service.refreshStatus(row);
    await service.deprovision(row);
    expect(await service.getDnsRecords(row)).toEqual([]);
    expect(update).toHaveBeenCalledWith(
      'A',
      { id: row.id },
      {
        unsubscribeHostname: 'crm.example.test',
        unsubscribeHostnameId: null,
        unsubscribeHostnameStatus: 'ACTIVE',
      },
    );
    expect(dns.registerHostname).not.toHaveBeenCalled();
    expect(dns.deleteHostnameSilently).not.toHaveBeenCalled();
    expect(dns.isHostnameWorking).not.toHaveBeenCalled();
    expect(dns.getHostnameWithRecords).not.toHaveBeenCalled();
  });
});
