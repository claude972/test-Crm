import { randomUUID } from 'node:crypto';
import { type Request } from 'express';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { SameOriginWorkspaceService } from 'src/engine/core-modules/auth/services/same-origin-workspace.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
jest.mock('src/engine/core-modules/auth/services/sign-in-up.service', () => ({
  SignInUpService: class {},
}));
jest.mock(
  'src/engine/core-modules/auth/token/services/login-token.service',
  () => ({ LoginTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service',
  () => ({ WorkspaceDomainsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class {} }),
);
const A = randomUUID(),
  B = randomUUID(),
  C = randomUUID(),
  U = randomUUID(),
  M = randomUUID();
const actor = { workspaceId: A, userId: U, userWorkspaceId: M };
const request = { headers: { origin: 'https://crm.example.test' } } as Request;
const user = { id: U, email: 'owner@example.test', disabled: false };
const workspace = (id: string) => ({
  id,
  activationStatus: 'ACTIVE',
  isPasswordAuthEnabled: true,
  isGoogleAuthEnabled: false,
  isMicrosoftAuthEnabled: false,
});
const setup = () => {
  let enabled = true,
    actorAlive = true,
    targetAlive = true;
  const domains = {
    isSameOriginMultiWorkspaceEnabled: jest.fn(() => enabled),
    assertSameOriginWorkspaceRequest: jest.fn((origin: string) => {
      if (!enabled || origin !== 'https://crm.example.test')
        throw new AuthException(
          'Origin refused',
          AuthExceptionCode.FORBIDDEN_EXCEPTION,
        );
    }),
    getWorkspaceUrls: () => ({ subdomainUrl: 'https://crm.example.test/' }),
  };
  const signInUp = {
    assertSameOriginWorkspaceCreationAllowed: jest
      .fn()
      .mockResolvedValue(undefined),
    signUpOnNewWorkspaceForSameOrigin: jest
      .fn()
      .mockResolvedValue({ user, workspace: workspace(B) }),
  };
  const loginTokens = {
    getSameOriginSessionBinding: jest.fn().mockResolvedValue('a'.repeat(64)),
    generateLoginTokenForRequest: jest.fn().mockResolvedValue({
      token: 'native-login-fixture',
      expiresAt: new Date(),
    }),
  };
  const memberships = {
    findOne: jest.fn(
      async ({ where }: { where: { id?: string; workspaceId: string } }) =>
        where.id
          ? actorAlive && where.id === M && where.workspaceId === A
            ? {
                id: M,
                userId: U,
                workspaceId: A,
                user,
                workspace: workspace(A),
              }
            : null
          : targetAlive && where.workspaceId === B
            ? {
                id: randomUUID(),
                userId: U,
                workspaceId: B,
                user,
                workspace: workspace(B),
              }
            : null,
    ),
  };
  const service = new SameOriginWorkspaceService(
    domains as never,
    signInUp as never,
    loginTokens as never,
    memberships as never,
  );
  return {
    service,
    domains,
    signInUp,
    loginTokens,
    memberships,
    disable: () => {
      enabled = false;
    },
    revokeActor: () => {
      actorAlive = false;
    },
    revokeTarget: () => {
      targetAlive = false;
    },
  };
};
describe('same-origin authenticated workspace operations', () => {
  it('returns a disabled capability without enabling public signup when the opt-in is off', async () => {
    const { service, disable, memberships } = setup();
    disable();
    expect(
      await service.capabilities(actor, AuthProviderEnum.Password, request),
    ).toEqual({ enabled: false, canCreateWorkspace: false });
    expect(memberships.findOne).not.toHaveBeenCalled();
  });
  it('creates with the native service and returns a native cookie-bound LOGIN token', async () => {
    const { service, signInUp, loginTokens } = setup();
    expect(
      await service.create(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, displayName: '  Société B  ' },
        request,
      ),
    ).toMatchObject({ workspace: { id: B } });
    expect(signInUp.signUpOnNewWorkspaceForSameOrigin).toHaveBeenCalledWith(
      { ...actor, sessionHash: 'a'.repeat(64) },
      'Société B',
    );
    expect(loginTokens.getSameOriginSessionBinding).toHaveBeenCalledWith(
      request,
      U,
      A,
    );
    expect(loginTokens.generateLoginTokenForRequest).toHaveBeenCalledWith(
      user,
      B,
      AuthProviderEnum.Password,
      request,
      true,
    );
  });
  it('selects only an existing owned membership without joining a workspace or changing user identity', async () => {
    const { service, signInUp, loginTokens } = setup();
    expect(
      await service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, workspaceId: B },
        request,
      ),
    ).toMatchObject({ workspace: { id: B } });
    expect(signInUp.signUpOnNewWorkspaceForSameOrigin).not.toHaveBeenCalled();
    expect(loginTokens.generateLoginTokenForRequest).toHaveBeenCalledWith(
      user,
      B,
      AuthProviderEnum.Password,
      request,
      true,
    );
  });
  it.each([C, randomUUID()])(
    'does not mint a token for an unauthorized target %s',
    async (workspaceId) => {
      const { service, loginTokens } = setup();
      await expect(
        service.select(
          actor,
          AuthProviderEnum.Password,
          { expectedWorkspaceId: A, workspaceId },
          request,
        ),
      ).rejects.toThrow('Workspace access is unavailable');
      expect(loginTokens.generateLoginTokenForRequest).not.toHaveBeenCalled();
    },
  );
  it('rejects a stale expected workspace before tenant lookup', async () => {
    const { service, memberships } = setup();
    await expect(
      service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: B, workspaceId: C },
        request,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(memberships.findOne).not.toHaveBeenCalled();
  });
  it('requires the actual verified session scope, not just a matching client workspace ID', async () => {
    const { service, loginTokens, memberships } = setup();
    loginTokens.getSameOriginSessionBinding.mockRejectedValue(
      new AuthException('Superseded', AuthExceptionCode.SESSION_SUPERSEDED),
    );
    await expect(
      service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, workspaceId: B },
        request,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(memberships.findOne).not.toHaveBeenCalled();
  });
  it('refuses a malicious origin before membership and token operations', async () => {
    const { service, memberships, loginTokens } = setup();
    await expect(
      service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, workspaceId: B },
        { headers: { origin: 'https://evil.test' } } as Request,
      ),
    ).rejects.toThrow('Origin refused');
    expect(memberships.findOne).not.toHaveBeenCalled();
    expect(loginTokens.generateLoginTokenForRequest).not.toHaveBeenCalled();
  });
  it('refuses revoked source or target membership', async () => {
    const first = setup();
    first.revokeActor();
    await expect(
      first.service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, workspaceId: B },
        request,
      ),
    ).rejects.toThrow('Workspace access is unavailable');
    const second = setup();
    second.revokeTarget();
    await expect(
      second.service.select(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, workspaceId: B },
        request,
      ),
    ).rejects.toThrow('Workspace access is unavailable');
    expect(
      second.loginTokens.generateLoginTokenForRequest,
    ).not.toHaveBeenCalled();
  });
  it.each([
    AuthProviderEnum.Google,
    AuthProviderEnum.SSO,
    AuthProviderEnum.Impersonation,
  ])('does not bypass target provider policy for %s', async (provider) => {
    const { service, loginTokens } = setup();
    await expect(
      service.select(
        actor,
        provider,
        { expectedWorkspaceId: A, workspaceId: B },
        request,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.OAUTH_ACCESS_DENIED });
    expect(loginTokens.generateLoginTokenForRequest).not.toHaveBeenCalled();
  });
  it('reports native admin/quota refusal as a disabled create capability and propagates infrastructure errors', async () => {
    const { service, signInUp } = setup();
    signInUp.assertSameOriginWorkspaceCreationAllowed.mockRejectedValue(
      new AuthException('Quota', AuthExceptionCode.FORBIDDEN_EXCEPTION),
    );
    expect(
      await service.capabilities(actor, AuthProviderEnum.Password, request),
    ).toEqual({ enabled: true, canCreateWorkspace: false });
    signInUp.assertSameOriginWorkspaceCreationAllowed.mockRejectedValue(
      Error('Storage unavailable'),
    );
    await expect(
      service.capabilities(actor, AuthProviderEnum.Password, request),
    ).rejects.toThrow('Storage unavailable');
  });
  it('rejects invalid or extra input fields before native writes', async () => {
    const { service, signInUp } = setup();
    await expect(
      service.create(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, displayName: '   ' },
        request,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.INVALID_INPUT });
    await expect(
      service.create(
        actor,
        AuthProviderEnum.Password,
        { expectedWorkspaceId: A, displayName: 'B', userId: C } as never,
        request,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.INVALID_INPUT });
    expect(signInUp.signUpOnNewWorkspaceForSameOrigin).not.toHaveBeenCalled();
  });
});
