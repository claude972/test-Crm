import { randomBytes, randomUUID } from 'node:crypto';
import { type Request } from 'express';
import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { type LoginTokenJwtPayload } from 'src/engine/core-modules/auth/types/login-token-jwt-payload.type';
import { hashUserSessionToken } from 'src/engine/core-modules/user-session/utils/hash-user-session-token.util';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
jest.mock(
  'src/engine/core-modules/user-session/services/user-session.service',
  () => ({ UserSessionService: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-session/services/user-session-cookie.service',
  () => ({ UserSessionCookieService: class {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/workspace-agnostic-token.service',
  () => ({ WorkspaceAgnosticTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/refresh-token.service',
  () => ({ RefreshTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));
const U = randomUUID(),
  A = randomUUID(),
  B = randomUUID();
const user = { id: U, email: 'owner@example.test' };
const setup = (enabled = true, multiDomain = false) => {
  const current = randomBytes(32).toString('hex'),
    next = randomBytes(32).toString('hex');
  const request = (
    token: string | undefined = current,
    origin = 'https://crm.example.test',
  ) =>
    ({ headers: { origin, ...(token ? { cookie: token } : {}) } }) as Request;
  const live = new Map<
    string,
    {
      userId: string;
      sub: string;
      workspaceId?: string;
      authProvider: AuthProviderEnum;
      type: JwtTokenTypeEnum;
    }
  >([
    [
      current,
      {
        userId: U,
        sub: U,
        workspaceId: A,
        authProvider: AuthProviderEnum.Password,
        type: JwtTokenTypeEnum.ACCESS,
      },
    ],
  ]);
  const sessions = {
    resolveSession: jest.fn(async (token: string) => {
      const payload = live.get(token);
      if (!payload)
        throw new AuthException(
          'Superseded native session',
          AuthExceptionCode.SESSION_SUPERSEDED,
        );
      return { payload };
    }),
    issueSessionForTokenPair: jest.fn(async () => {
      live.delete(current);
      live.set(next, {
        userId: U,
        sub: U,
        workspaceId: undefined,
        authProvider: AuthProviderEnum.Password,
        type: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC,
      });
      return { sessionToken: next };
    }),
  };
  const cookies = {
    extractSessionTokenFromRequest: (input: Request) => input.headers.cookie,
  };
  const jwt = {
    signAsyncOrThrow: jest.fn(async (payload: LoginTokenJwtPayload) =>
      JSON.stringify(payload),
    ),
    verifyJwtToken: jest.fn().mockResolvedValue(undefined),
    decode: jest.fn((token: string) => JSON.parse(token)),
  };
  const settings: Record<string, unknown> = {
    IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: enabled,
    IS_MULTIWORKSPACE_ENABLED: multiDomain,
    FRONTEND_URL: 'https://crm.example.test',
    LOGIN_TOKEN_EXPIRES_IN: '10m',
  };
  const config = { get: (key: string) => settings[key] };
  const used = new Set<string>();
  const cache = {
    setIfAbsent: jest.fn(async (key: string) => {
      if (used.has(key)) return false;
      used.add(key);
      return true;
    }),
  };
  const agnostic = {
    generateWorkspaceAgnosticToken: jest.fn().mockResolvedValue({
      token: 'native-agnostic-fixture',
      expiresAt: new Date(),
    }),
  };
  const refresh = {
    generateRefreshToken: jest.fn().mockResolvedValue({
      token: 'native-refresh-fixture',
      expiresAt: new Date(),
    }),
  };
  const service = new LoginTokenService(
    jwt as never,
    config as never,
    cache as never,
    sessions as never,
    cookies as never,
    agnostic as never,
    refresh as never,
  );
  return {
    service,
    current,
    next,
    request,
    live,
    sessions,
    jwt,
    cache,
    agnostic,
    refresh,
    settings,
  };
};
describe('native LOGIN same-origin session binding', () => {
  it.each([
    [false, false],
    [true, true],
  ])(
    'preserves unbound native LOGIN behavior when opt-in=%s multi-domain=%s',
    async (enabled, multiDomain) => {
      const { service, sessions } = setup(enabled, multiDomain);
      const token = await service.generateLoginToken(
        user.email,
        B,
        AuthProviderEnum.Password,
      );
      expect(JSON.parse(token.token)).not.toHaveProperty(
        'sameOriginSessionHash',
      );
      await expect(
        service.assertSameOriginSessionForLoginToken(
          JSON.parse(token.token),
          {} as Request,
        ),
      ).resolves.toBeUndefined();
      expect(sessions.resolveSession).not.toHaveBeenCalled();
    },
  );
  it('does not mint or redeem an unbound native LOGIN in canonical opt-in mode', async () => {
    const { service, request, cache } = setup();
    await expect(
      service.generateLoginToken(user.email, B, AuthProviderEnum.Password),
    ).rejects.toMatchObject({ code: AuthExceptionCode.UNAUTHENTICATED });
    await expect(
      service.assertSameOriginSessionForLoginToken(
        {
          type: JwtTokenTypeEnum.LOGIN,
          sub: user.email,
          workspaceId: B,
          authProvider: AuthProviderEnum.Password,
          jti: randomUUID(),
        },
        request(),
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(cache.setIfAbsent).not.toHaveBeenCalled();
  });
  it('binds selection to the actual native session user and workspace', async () => {
    const { service, current, request } = setup();
    expect(await service.getSameOriginSessionBinding(request(), U, A)).toBe(
      hashUserSessionToken(current),
    );
    await expect(
      service.getSameOriginSessionBinding(request(), U, B),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    await expect(
      service.getSameOriginSessionBinding(request(), randomUUID(), A),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
  });
  it('uses the newly issued agnostic cookie when initial sign-in rotated a previous cookie', async () => {
    const { service, request, current, next, sessions, jwt } = setup();
    const token = await service.generateLoginTokenForRequest(
      user,
      B,
      AuthProviderEnum.Password,
      request(),
    );
    expect(sessions.issueSessionForTokenPair).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(token.token);
    expect(payload.sameOriginSessionHash).toBe(hashUserSessionToken(next));
    expect(payload.sameOriginSessionHash).not.toBe(
      hashUserSessionToken(current),
    );
    expect(jwt.signAsyncOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: JwtTokenTypeEnum.LOGIN,
        workspaceId: B,
        sub: user.email,
      }),
      expect.any(Object),
    );
    await expect(
      service.assertSameOriginSessionForLoginToken(payload, request(next)),
    ).resolves.toBeUndefined();
  });
  it('preserves the browser session through selection and a legitimate MFA retry', async () => {
    const { service, request, sessions } = setup();
    const token = await service.generateLoginTokenForRequest(
      user,
      B,
      AuthProviderEnum.Password,
      request(),
      true,
    );
    const payload = JSON.parse(token.token);
    await service.assertSameOriginSessionForLoginToken(payload, request());
    await service.assertSameOriginSessionForLoginToken(payload, request());
    expect(sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
    await service.consumeLoginTokenOrThrow(payload);
    await expect(
      service.consumeLoginTokenOrThrow(payload),
    ).rejects.toMatchObject({ code: AuthExceptionCode.UNAUTHENTICATED });
  });
  it('rejects a delayed A token after the browser switched to a new B cookie before consuming its jti', async () => {
    const { service, current, next, request, live, cache } = setup();
    const token = await service.generateLoginTokenForRequest(
      user,
      B,
      AuthProviderEnum.Password,
      request(),
      true,
    );
    live.delete(current);
    live.set(next, {
      userId: U,
      sub: U,
      workspaceId: B,
      authProvider: AuthProviderEnum.Password,
      type: JwtTokenTypeEnum.ACCESS,
    });
    await expect(
      service.assertSameOriginSessionForLoginToken(
        JSON.parse(token.token),
        request(next),
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    await expect(
      service.assertSameOriginSessionForLoginToken(
        JSON.parse(token.token),
        request(current),
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(cache.setIfAbsent).not.toHaveBeenCalled();
  });
  it('rejects an absent cookie, invalid session, wrong origin and provider mismatch', async () => {
    const { service, request, current, live } = setup();
    const token = await service.generateLoginTokenForRequest(
      user,
      B,
      AuthProviderEnum.Password,
      request(),
      true,
    );
    const payload = JSON.parse(token.token);
    await expect(
      service.getSameOriginSessionBinding(
        { headers: { origin: 'https://crm.example.test' } } as Request,
        U,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.UNAUTHENTICATED });
    await expect(
      service.getSameOriginSessionBinding(request('invalid'), U),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    await expect(
      service.getSameOriginSessionBinding(
        request(current, 'https://evil.test'),
        U,
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION });
    live.get(current)!.authProvider = AuthProviderEnum.Google;
    await expect(
      service.assertSameOriginSessionForLoginToken(payload, request()),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
  });
  it('keeps signature and native token-kind checks before token redemption', async () => {
    const { service, jwt, cache } = setup();
    jwt.verifyJwtToken.mockRejectedValueOnce(Error('Invalid native signature'));
    await expect(service.verifyLoginToken('{}')).rejects.toThrow(
      'Invalid native signature',
    );
    await expect(
      service.verifyLoginToken(
        JSON.stringify({ type: JwtTokenTypeEnum.ACCESS }),
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.INVALID_JWT_TOKEN_TYPE });
    expect(cache.setIfAbsent).not.toHaveBeenCalled();
  });
});
