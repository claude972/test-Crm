import { randomUUID } from 'node:crypto';
import { AuthExceptionCode } from 'src/engine/core-modules/auth/auth.exception';
import { SignInUpService } from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
jest.mock(
  'src/engine/core-modules/event-logs/emit/event-log-emitter.service',
  () => ({ EventLogEmitterService: class EventLogEmitterService {} }),
);
jest.mock('src/engine/core-modules/application/application.service', () => ({
  ApplicationService: class ApplicationService {},
}));
jest.mock(
  'src/engine/core-modules/file-storage/services/file-storage.service',
  () => ({ FileStorageService: class FileStorageService {} }),
);
jest.mock('src/engine/core-modules/billing/services/billing.service', () => ({
  BillingService: class BillingService {},
}));
jest.mock(
  'src/engine/core-modules/domain/subdomain-manager/services/subdomain-manager.service',
  () => ({ SubdomainManagerService: class SubdomainManagerService {} }),
);
jest.mock(
  'src/engine/core-modules/enterprise/services/enterprise-plan.service',
  () => ({ EnterprisePlanService: class EnterprisePlanService {} }),
);
jest.mock(
  'src/engine/core-modules/exception-handler/exception-handler.service',
  () => ({ ExceptionHandlerService: class ExceptionHandlerService {} }),
);
jest.mock(
  'src/engine/core-modules/file/file-core-picture/services/file-core-picture.service',
  () => ({ FileCorePictureService: class FileCorePictureService {} }),
);
jest.mock('src/engine/core-modules/metrics/metrics.service', () => ({
  MetricsService: class MetricsService {},
}));
jest.mock('src/engine/core-modules/onboarding/onboarding.service', () => ({
  OnboardingService: class OnboardingService {},
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class KovaaLabCRMConfigService {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.service',
  () => ({ UserWorkspaceService: class UserWorkspaceService {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock('src/engine/core-modules/user/services/user.service', () => ({
  UserService: class UserService {},
}));
jest.mock('src/engine/core-modules/user/user.entity', () => ({
  UserEntity: class UserEntity {},
}));
jest.mock(
  'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service',
  () => ({ WorkspaceInvitationService: class WorkspaceInvitationService {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class WorkspaceEntity {},
}));
jest.mock(
  'src/engine/workspace-cache/services/workspace-cache.service',
  () => ({ WorkspaceCacheService: class {} }),
);
jest.mock('src/engine/workspace-event-emitter/workspace-event-emitter', () => ({
  WorkspaceEventEmitter: class {},
}));
jest.mock('src/engine/core-modules/app-token/app-token.entity', () => ({
  AppTokenType: {},
}));
jest.mock(
  'src/engine/core-modules/user-session/services/user-session.service',
  () => ({ UserSessionService: class {} }),
);
const actor = {
  sessionHash: 'a'.repeat(64),
  userId: randomUUID(),
  workspaceId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const setup = (initialCount = 1) => {
  let enabled = true,
    multiDomain = false,
    admin = true,
    allowed = true,
    count = initialCount,
    license = false;
  const user = {
    id: actor.userId,
    email: 'owner@gmail.com',
    canAccessFullAdminPanel: true,
    locale: 'fr',
  };
  const userRepository = {
    findOneBy: jest.fn(async () => (allowed ? user : null)),
    count: jest.fn().mockResolvedValue(1),
  };
  const workspaceRepository = {
    count: jest.fn(async () => count),
    create: jest.fn((row: Record<string, unknown>) => ({ ...row })),
  };
  const memberships = {
    findOne: jest.fn(async () =>
      admin && allowed ? { id: actor.userWorkspaceId } : null,
    ),
  };
  let sessionAlive = true;
  const userSessions = {
    assertSameOriginWorkspaceSession: jest.fn(async () => {
      if (!sessionAlive) throw new Error('SESSION_SUPERSEDED');
    }),
  };
  let entered: (() => void) | undefined, release: Promise<void> | undefined;
  const save = jest.fn(
    async (_entity: unknown, row: Record<string, unknown>) => {
      count++;
      return { ...row };
    },
  );
  const manager = {
    getRepository: (entity: unknown) =>
      entity === UserWorkspaceEntity ? memberships : workspaceRepository,
    query: jest.fn(async () => {
      entered?.();
      if (release) await release;
    }),
    queryRunner: { manager: { save } },
  };
  let chain: Promise<unknown> = Promise.resolve();
  const dataSource = {
    manager,
    transaction: <T>(
      work: (transactionManager: typeof manager) => Promise<T>,
    ) => {
      const result = chain.then(() => work(manager));
      chain = result.catch(() => {});
      return result;
    },
  };
  const settings: Record<string, unknown> = {
    IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS: true,
  };
  const config = {
    get: (key: string) =>
      key === 'IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED'
        ? enabled
        : key === 'IS_MULTIWORKSPACE_ENABLED'
          ? multiDomain
          : settings[key],
  };
  const service = Object.create(SignInUpService.prototype) as SignInUpService;
  Object.assign(service, {
    userSessions,
    userRepository,
    workspaceRepository,
    dataSource,
    kovaaLabConfigService: config,
    enterprisePlanService: { isValid: () => license },
    subdomainManagerService: {
      generateSubdomain: async () => `company-${randomUUID()}`,
    },
    applicationService: {
      createWorkspaceCustomApplication: async () => ({
        universalIdentifier: randomUUID(),
      }),
    },
    userWorkspaceService: { create: jest.fn().mockResolvedValue(undefined) },
    onboardingService: {
      setOnboardingConnectAccountPending: jest.fn(),
      setOnboardingCreateProfilePending: jest.fn(),
      setOnboardingInviteTeamPending: jest.fn(),
    },
    eventLogEmitterService: {
      createContext: () => ({
        insertWorkspaceEvent: jest.fn().mockResolvedValue(undefined),
      }),
    },
    billingService: { isBillingEnabled: () => false },
    fileStorageService: { invalidateStorageStock: jest.fn() },
    workspaceCacheService: { invalidateAndRecompute: jest.fn() },
  });
  return {
    service,
    user,
    userRepository,
    workspaceRepository,
    memberships,
    manager,
    save,
    userSessions,
    supersedeSession: () => {
      sessionAlive = false;
    },
    settings,
    disable: () => {
      enabled = false;
    },
    multiDomain: () => {
      multiDomain = true;
    },
    revoke: () => {
      allowed = false;
    },
    demote: () => {
      admin = false;
    },
    license: () => {
      license = true;
    },
    block: () => {
      let start!: () => void, finish!: () => void;
      const started = new Promise<void>((resolve) => {
        start = resolve;
      });
      release = new Promise<void>((resolve) => {
        finish = resolve;
      });
      entered = start;
      return { started, finish };
    },
  };
};
describe('native same-origin workspace creation policy and quota', () => {
  it('rechecks the source browser session after quota lock wait before any new company is persisted', async () => {
    const f = setup();
    const gate = f.block();
    const pending = f.service.signUpOnNewWorkspaceForSameOrigin(
      actor,
      'Synthetic company',
    );
    await gate.started;
    f.supersedeSession();
    gate.finish();
    await expect(pending).rejects.toThrow();
    expect(
      f.userSessions.assertSameOriginWorkspaceSession,
    ).toHaveBeenLastCalledWith(actor, f.manager);
    expect(f.save).not.toHaveBeenCalled();
  });

  it('allows an existing live server admin while preserving the native quota and membership checks', async () => {
    const { service, memberships } = setup();
    await expect(
      service.assertSameOriginWorkspaceCreationAllowed(actor),
    ).resolves.toBeUndefined();
    expect(memberships.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: actor.userWorkspaceId,
          userId: actor.userId,
          workspaceId: actor.workspaceId,
          user: expect.objectContaining({
            disabled: false,
            canAccessFullAdminPanel: true,
          }),
        }),
      }),
    );
  });
  it('does not enable the original public/native workspace signup path', async () => {
    const { service, user, save } = setup();
    await expect(
      service.signUpOnNewWorkspace(
        { type: 'existingUser', existingUser: user as never },
        { displayName: 'Public' },
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SIGNUP_DISABLED });
    expect(save).not.toHaveBeenCalled();
  });
  it.each(['disable', 'multiDomain'] as const)(
    'does not activate the new creation policy when %s applies',
    async (state) => {
      const fixture = setup();
      fixture[state]();
      await expect(
        fixture.service.assertSameOriginWorkspaceCreationAllowed(actor),
      ).rejects.toMatchObject({ code: AuthExceptionCode.SIGNUP_DISABLED });
    },
  );
  it('refuses a revoked user and an administrator demoted after initial session authentication', async () => {
    const fixture = setup();
    fixture.revoke();
    await expect(
      fixture.service.assertSameOriginWorkspaceCreationAllowed(actor),
    ).rejects.toMatchObject({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION });
    const other = setup();
    other.demote();
    other.settings.IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS = false;
    await expect(
      other.service.assertSameOriginWorkspaceCreationAllowed(actor),
    ).rejects.toMatchObject({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION });
  });
  it('retains the native workspace limit without a valid organization key', async () => {
    const { service, save } = setup(5);
    await expect(
      service.signUpOnNewWorkspaceForSameOrigin(actor, 'Company 6'),
    ).rejects.toMatchObject({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION });
    expect(save).not.toHaveBeenCalled();
  });
  it('uses the existing license decision rather than creating its own entitlement', async () => {
    const fixture = setup(5);
    fixture.license();
    await expect(
      fixture.service.assertSameOriginWorkspaceCreationAllowed(actor),
    ).resolves.toBeUndefined();
  });
  it('rechecks administrator access after the creation lock, before any workspace insert', async () => {
    const { service, save, workspaceRepository, block, demote } = setup();
    const gate = block();
    const pending = service.signUpOnNewWorkspaceForSameOrigin(
      actor,
      'Company B',
    );
    const rejection = expect(pending).rejects.toMatchObject({
      code: AuthExceptionCode.FORBIDDEN_EXCEPTION,
    });
    await gate.started;
    demote();
    gate.finish();
    await rejection;
    expect(workspaceRepository.create).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
  it('serializes concurrent native creations so the fifth-workspace quota cannot be raced', async () => {
    const { service, save, manager } = setup(4);
    const results = await Promise.allSettled([
      service.signUpOnNewWorkspaceForSameOrigin(actor, 'Company B'),
      service.signUpOnNewWorkspaceForSameOrigin(actor, 'Company C'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      WorkspaceEntity,
      expect.objectContaining({
        displayName: expect.stringMatching(/^Company [BC]$/),
      }),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock'),
      ['same-origin-workspace-creation'],
    );
  });
});
