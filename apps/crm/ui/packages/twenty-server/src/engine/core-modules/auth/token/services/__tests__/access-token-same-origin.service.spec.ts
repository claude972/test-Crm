import { randomUUID } from 'node:crypto';
import { type Request } from 'express';
import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { type RawAuthContext } from 'src/engine/core-modules/auth/types/raw-auth-context.type';
import { assertExpectedWorkspaceContext } from 'src/engine/guards/utils/assert-expected-workspace-context.util';
jest.mock('src/engine/core-modules/user/user.entity', () => ({
  UserEntity: class {},
}));
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class {} }),
);
jest.mock('src/engine/core-modules/auth/strategies/jwt.auth.strategy', () => ({
  JwtAuthStrategy: class {},
}));
jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-session/services/user-session.service',
  () => ({ UserSessionService: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-session/services/user-session-cookie.service',
  () => ({ UserSessionCookieService: class {} }),
);
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
const U = randomUUID(),
  A = randomUUID(),
  B = randomUUID(),
  M = randomUUID();
const context = (workspaceId: string, userId = U, membershipId = M) =>
  ({
    user: { id: userId },
    workspace: { id: workspaceId },
    userWorkspaceId: membershipId,
    tokenType: JwtTokenTypeEnum.ACCESS,
  }) as RawAuthContext;
const setup = (enabled = true, multiDomain = false) => {
  let bearerContext = context(A),
    cookieContext = context(A);
  const jwt = {
    extractJwtFromRequest: () => (request: Request) =>
      request.headers.authorization,
    verifyJwtToken: jest.fn().mockResolvedValue(undefined),
    decode: jest.fn(() => ({ credential: 'verified-bearer-fixture' })),
  };
  const sessions = {
    resolveSession: jest.fn().mockResolvedValue({
      payload: { credential: 'cookie-fixture' },
      authenticatedAt: new Date(),
    }),
  };
  const strategy = {
    validate: jest.fn(async (payload: { credential: string }) =>
      payload.credential === 'cookie-fixture' ? cookieContext : bearerContext,
    ),
  };
  const cookies = {
    extractSessionTokenFromRequest: (request: Request) =>
      request.headers.cookie,
  };
  const config = {
    get: (key: string) =>
      key === 'IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED'
        ? enabled
        : key === 'IS_MULTIWORKSPACE_ENABLED'
          ? multiDomain
          : undefined,
  };
  const service = Object.create(
    AccessTokenService.prototype,
  ) as AccessTokenService;
  Object.assign(service, {
    jwtWrapperService: jwt,
    jwtStrategy: strategy,
    userSessionService: sessions,
    userSessionCookieService: cookies,
    kovaaLabConfigService: config,
  });
  const request = {
    method: 'POST',
    path: '/graphql',
    headers: {
      authorization: 'verified-bearer-fixture',
      cookie: 'native-cookie-fixture',
      'x-expected-workspace-id': A,
    },
    body: { query: 'mutation { createOneCompany { id } }' },
  } as unknown as Request;
  return {
    service,
    jwt,
    sessions,
    strategy,
    request,
    config,
    bearer: (value: RawAuthContext) => {
      bearerContext = value;
    },
    cookie: (value: RawAuthContext) => {
      cookieContext = value;
    },
  };
};
describe('native dual credential coherence in same-origin mode', () => {
  it('verifies both native credentials when their user/workspace/membership agree', async () => {
    const f = setup();
    expect(await f.service.validateTokenByRequest(f.request)).toMatchObject({
      workspace: { id: A },
    });
    expect(f.jwt.verifyJwtToken).toHaveBeenCalledWith(
      'verified-bearer-fixture',
    );
    expect(f.sessions.resolveSession).toHaveBeenCalledTimes(1);
  });
  it.each([context(B), context(A, randomUUID()), context(A, U, randomUUID())])(
    'rejects divergent user/workspace/membership contexts',
    async (cookie) => {
      const f = setup();
      f.cookie(cookie);
      await expect(
        f.service.validateTokenByRequest(f.request),
      ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    },
  );
  it('does not let a stale A JWT plus cookie B and header A cause any A or B write', async () => {
    const f = setup();
    f.cookie(context(B));
    const writes: string[] = [];
    const execute = async () => {
      const verified = await f.service.validateTokenByRequest(f.request);
      Object.assign(f.request, verified);
      assertExpectedWorkspaceContext(f.request, f.config as never, 'graphql');
      writes.push(verified.workspace!.id);
    };
    await expect(execute()).rejects.toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    expect(writes).toEqual([]);
  });
  it('never ignores a malformed bearer merely because a valid browser cookie exists', async () => {
    const f = setup();
    f.jwt.verifyJwtToken.mockRejectedValueOnce(
      Error('Invalid native signature'),
    );
    await expect(f.service.validateTokenByRequest(f.request)).rejects.toThrow(
      'Invalid native signature',
    );
    expect(f.sessions.resolveSession).not.toHaveBeenCalled();
  });
  it('does not silently accept an old bearer after the presented native cookie expired or was revoked', async () => {
    const f = setup();
    f.sessions.resolveSession.mockRejectedValue(
      new AuthException('Revoked session', AuthExceptionCode.UNAUTHENTICATED),
    );
    await expect(
      f.service.validateTokenByRequest(f.request),
    ).rejects.toMatchObject({ code: AuthExceptionCode.UNAUTHENTICATED });
  });
  it.each([
    [false, false],
    [true, true],
  ])(
    'preserves native bearer precedence when opt-in=%s multi-domain=%s',
    async (enabled, multiDomain) => {
      const f = setup(enabled, multiDomain);
      f.cookie(context(B));
      expect(await f.service.validateTokenByRequest(f.request)).toMatchObject({
        workspace: { id: A },
      });
      expect(f.sessions.resolveSession).not.toHaveBeenCalled();
    },
  );
  it.each([
    {
      apiKey: { id: 'native-key' },
      tokenType: JwtTokenTypeEnum.API_KEY,
      workspace: { id: A },
    },
    {
      application: { id: 'native-app' },
      tokenType: JwtTokenTypeEnum.APPLICATION_ACCESS,
      workspace: { id: A },
    },
  ])(
    'keeps fixed-scope API and machine credentials independent of incidental cookies',
    async (principal) => {
      const f = setup();
      f.bearer(principal as RawAuthContext);
      f.cookie(context(B));
      expect(await f.service.validateTokenByRequest(f.request)).toEqual(
        principal,
      );
      expect(f.sessions.resolveSession).not.toHaveBeenCalled();
    },
  );
  it('leaves native public LOGIN/MFA/SSO exchange under their own cookie binding instead of the stale display context', async () => {
    const f = setup();
    f.cookie(context(B));
    Object.assign(f.request, { path: '/metadata' });
    f.request.body.query =
      'mutation { getAuthTokensFromLoginToken(loginToken:"bound", origin:"https://crm.example.test") { tokens { refreshToken { token } } } }';
    await expect(
      f.service.validateTokenByRequest(f.request),
    ).resolves.toMatchObject({ workspace: { id: A } });
    expect(f.sessions.resolveSession).not.toHaveBeenCalled();
  });
});
