import { randomUUID } from 'node:crypto';
import { type Request } from 'express';
import { AuthResolver } from 'src/engine/core-modules/auth/auth.resolver';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
jest.mock('src/engine/core-modules/api-key/services/api-key.service', () => ({
  ApiKeyService: class ApiKeyService {},
}));
jest.mock(
  'src/engine/core-modules/event-logs/emit/event-log-emitter.service',
  () => ({ EventLogEmitterService: class EventLogEmitterService {} }),
);
jest.mock(
  'src/engine/core-modules/impersonation/services/impersonation-authorization.service',
  () => ({
    ImpersonationAuthorizationService: class ImpersonationAuthorizationService {},
  }),
);
jest.mock('src/engine/core-modules/auth/services/sign-in-up.service', () => ({
  SignInUpService: class SignInUpService {},
}));
jest.mock('src/engine/core-modules/auth/services/auth.service', () => ({
  AuthService: class AuthService {},
}));
jest.mock(
  'src/engine/core-modules/auth/services/reset-password.service',
  () => ({ ResetPasswordService: class ResetPasswordService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/access-token.service',
  () => ({ AccessTokenService: class AccessTokenService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/refresh-token.service',
  () => ({ RefreshTokenService: class RefreshTokenService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/sso-exchange-token.service',
  () => ({ SsoExchangeTokenService: class SsoExchangeTokenService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/workspace-agnostic-token.service',
  () => ({
    WorkspaceAgnosticTokenService: class WorkspaceAgnosticTokenService {},
  }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/email-verification-token.service',
  () => ({
    EmailVerificationTokenService: class EmailVerificationTokenService {},
  }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/login-token.service',
  () => ({ LoginTokenService: class LoginTokenService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/renew-token.service',
  () => ({ RenewTokenService: class RenewTokenService {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/transient-token.service',
  () => ({ TransientTokenService: class TransientTokenService {} }),
);
jest.mock('src/engine/core-modules/captcha/captcha.guard', () => ({
  CaptchaGuard: class CaptchaGuard {},
}));
jest.mock(
  'src/engine/core-modules/domain/subdomain-manager/services/subdomain-manager.service',
  () => ({ SubdomainManagerService: class SubdomainManagerService {} }),
);
jest.mock(
  'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service',
  () => ({ WorkspaceDomainsService: class WorkspaceDomainsService {} }),
);
jest.mock(
  'src/engine/core-modules/email-verification/services/email-verification.service',
  () => ({ EmailVerificationService: class EmailVerificationService {} }),
);
jest.mock(
  'src/engine/core-modules/file/file-core-picture/services/file-core-picture.service',
  () => ({ FileCorePictureService: class FileCorePictureService {} }),
);
jest.mock(
  'src/engine/core-modules/file/file-upload/services/file-upload.service',
  () => ({ FileUploadService: class FileUploadService {} }),
);
jest.mock(
  'src/engine/core-modules/user-session/services/user-session.service',
  () => ({ UserSessionService: class UserSessionService {} }),
);
jest.mock(
  'src/engine/core-modules/user-session/services/user-session-cookie.service',
  () => ({ UserSessionCookieService: class UserSessionCookieService {} }),
);
jest.mock('src/engine/core-modules/sso/services/sso.service', () => ({
  SsoService: class SsoService {},
}));
jest.mock('src/engine/core-modules/throttler/throttler.service', () => ({
  ThrottlerService: class ThrottlerService {},
}));
jest.mock(
  'src/engine/core-modules/two-factor-authentication/two-factor-authentication.service',
  () => ({
    TwoFactorAuthenticationService: class TwoFactorAuthenticationService {},
  }),
);
jest.mock(
  'src/engine/core-modules/two-factor-authentication/services/two-factor-authentication-recovery.service',
  () => ({
    TwoFactorAuthenticationRecoveryService: class TwoFactorAuthenticationRecoveryService {},
  }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.service',
  () => ({ UserWorkspaceService: class UserWorkspaceService {} }),
);
jest.mock('src/engine/core-modules/user/services/user.service', () => ({
  UserService: class UserService {},
}));
jest.mock('src/engine/core-modules/user/user.entity', () => ({
  UserEntity: class UserEntity {},
}));
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class WorkspaceEntity {},
}));
jest.mock('src/engine/core-modules/app-token/app-token.entity', () => ({
  AppTokenEntity: class {},
  AppTokenType: {},
}));
jest.mock(
  'src/engine/metadata-modules/permissions/permissions.service',
  () => ({ PermissionsService: class {} }),
);
const U = randomUUID(),
  B = randomUUID(),
  H = 'b'.repeat(64);
const tokenPair = {
  accessOrWorkspaceAgnosticToken: {
    token: 'native-access-fixture',
    expiresAt: new Date(),
  },
  refreshToken: { token: 'native-refresh-fixture', expiresAt: new Date() },
};
const setup = () => {
  let sessionAlive = true;
  const payload = {
    type: JwtTokenTypeEnum.LOGIN,
    sub: 'owner@example.test',
    workspaceId: B,
    authProvider: AuthProviderEnum.Password,
    jti: randomUUID(),
    sameOriginSessionHash: H,
  };
  const user = {
    id: U,
    email: payload.sub,
    disabled: false,
    isEmailVerified: true,
  };
  const workspace = {
    id: B,
    isPasswordAuthEnabled: true,
    isGoogleAuthEnabled: false,
  };
  const login = {
    verifyLoginToken: jest.fn().mockResolvedValue(payload),
    assertSameOriginSessionForLoginToken: jest.fn(async () => {
      if (!sessionAlive)
        throw new AuthException(
          'Superseded',
          AuthExceptionCode.SESSION_SUPERSEDED,
        );
    }),
    consumeLoginTokenOrThrow: jest.fn(),
    createSameOriginAgnosticSession: jest
      .fn()
      .mockResolvedValue({ tokens: tokenPair, sameOriginSessionHash: H }),
    generateLoginToken: jest.fn().mockResolvedValue({
      token: 'native-bound-login-fixture',
      expiresAt: new Date(),
    }),
  };
  const domains = {
    isSameOriginMultiWorkspaceEnabled: () => true,
    assertSameOriginWorkspaceRequest: jest.fn((origin: string) => {
      if (origin !== 'https://crm.example.test')
        throw new AuthException(
          'Origin refused',
          AuthExceptionCode.FORBIDDEN_EXCEPTION,
        );
    }),
    getWorkspaceForLoginToken: jest.fn().mockResolvedValue(workspace),
  };
  const users = {
    findUserByEmailOrThrow: jest.fn().mockResolvedValue(user),
    findUserByIdOrThrow: jest.fn().mockResolvedValue(user),
  };
  const memberships = {
    getUserWorkspaceForUserOrThrow: jest.fn().mockResolvedValue({
      userId: U,
      workspaceId: B,
      twoFactorAuthenticationMethods: [],
    }),
  };
  const auth = {
    checkIsEmailVerified: jest.fn(),
    verify: jest.fn().mockResolvedValue({ tokens: tokenPair }),
  };
  const mfa = {
    validateTwoFactorAuthenticationRequirement: jest
      .fn()
      .mockResolvedValue(undefined),
    validateStrategy: jest.fn().mockResolvedValue(undefined),
  };
  const recovery = {
    redeemRecoveryCode: jest
      .fn()
      .mockResolvedValue({ provisioningUri: 'otpauth://synthetic' }),
  };
  const sessions = { issueSessionForTokenPair: jest.fn() };
  const exchange = {
    validateAndConsumeSsoExchangeTokenOrThrow: jest.fn().mockResolvedValue({
      userId: U,
      workspaceId: B,
      authProvider: AuthProviderEnum.SSO,
    }),
  };
  const resolver = Object.create(AuthResolver.prototype) as AuthResolver;
  Object.assign(resolver, {
    loginTokenService: login,
    workspaceDomainsService: domains,
    userService: users,
    userWorkspaceService: memberships,
    authService: auth,
    twoFactorAuthenticationService: mfa,
    twoFactorAuthenticationRecoveryService: recovery,
    userSessionService: sessions,
    ssoExchangeTokenService: exchange,
  });
  const request = {
    headers: { origin: 'https://crm.example.test' },
  } as Request;
  return {
    resolver,
    payload,
    user,
    workspace,
    login,
    domains,
    users,
    memberships,
    auth,
    mfa,
    recovery,
    sessions,
    exchange,
    request,
    supersede: () => {
      sessionAlive = false;
    },
  };
};
const barrier = () => {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    entered,
    release,
    call: async () => {
      enter();
      await wait;
    },
  };
};
describe('native LOGIN/MFA/SSO canonical redemption ordering', () => {
  it('preserves a bound LOGIN while MFA is required and redeems it only after a legitimate OTP step', async () => {
    const f = setup();
    f.mfa.validateTwoFactorAuthenticationRequirement.mockRejectedValueOnce(
      Error('MFA required'),
    );
    await expect(
      f.resolver.getAuthTokensFromLoginToken(
        { loginToken: 'fixture' },
        'https://crm.example.test',
        { req: f.request },
      ),
    ).rejects.toThrow('MFA required');
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
    expect(
      await f.resolver.getAuthTokensFromOTP(
        { loginToken: 'fixture', otp: '123456' },
        'https://crm.example.test',
        { req: f.request },
      ),
    ).toEqual({ tokens: tokenPair });
    expect(f.login.consumeLoginTokenOrThrow).toHaveBeenCalledTimes(1);
    expect(f.sessions.issueSessionForTokenPair).toHaveBeenCalledWith(
      expect.objectContaining({ expectedSessionHash: H, origin: 'sign_in' }),
    );
  });
  it('rejects a late A response after B superseded the session during native MFA validation, before consuming jti', async () => {
    const f = setup(),
      gate = barrier();
    f.mfa.validateTwoFactorAuthenticationRequirement.mockImplementation(
      gate.call,
    );
    const pending = f.resolver.getAuthTokensFromLoginToken(
      { loginToken: 'fixture' },
      'https://crm.example.test',
      { req: f.request },
    );
    const rejection = expect(pending).rejects.toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    await gate.entered;
    f.supersede();
    gate.release();
    await rejection;
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.auth.verify).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
  });
  it('also rechecks a delayed OTP before its one-use claim', async () => {
    const f = setup(),
      gate = barrier();
    f.mfa.validateStrategy.mockImplementation(gate.call);
    const pending = f.resolver.getAuthTokensFromOTP(
      { loginToken: 'fixture', otp: '123456' },
      'https://crm.example.test',
      { req: f.request },
    );
    const rejection = expect(pending).rejects.toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    await gate.entered;
    f.supersede();
    gate.release();
    await rejection;
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
  });
  it('passes the binding into native recovery-code session issuance as well', async () => {
    const f = setup();
    f.recovery.redeemRecoveryCode.mockResolvedValueOnce({
      provisioningUri: null,
    } as never);
    await f.resolver.getAuthTokensFromTwoFactorAuthenticationRecoveryCode(
      { loginToken: 'fixture', recoveryCode: 'synthetic-code' },
      'https://crm.example.test',
      { req: f.request },
    );
    expect(f.login.consumeLoginTokenOrThrow).toHaveBeenCalledTimes(1);
    expect(f.sessions.issueSessionForTokenPair).toHaveBeenCalledWith(
      expect.objectContaining({ expectedSessionHash: H }),
    );
  });
  it('keeps the current cookie and LOGIN valid when recovery requires MFA reprovisioning', async () => {
    const f = setup();
    expect(
      await f.resolver.getAuthTokensFromTwoFactorAuthenticationRecoveryCode(
        { loginToken: 'fixture', recoveryCode: 'synthetic-code' },
        'https://crm.example.test',
        { req: f.request },
      ),
    ).toEqual({ tokens: null, provisioningUri: 'otpauth://synthetic' });
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
  });
  it('does not return a late recovery provisioning secret after another workspace superseded the cookie', async () => {
    const f = setup(),
      gate = barrier();
    f.recovery.redeemRecoveryCode.mockImplementation(async () => {
      await gate.call();
      return { provisioningUri: 'otpauth://synthetic' };
    });
    const pending =
      f.resolver.getAuthTokensFromTwoFactorAuthenticationRecoveryCode(
        { loginToken: 'fixture', recoveryCode: 'synthetic-code' },
        'https://crm.example.test',
        { req: f.request },
      );
    const rejection = expect(pending).rejects.toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    await gate.entered;
    f.supersede();
    gate.release();
    await rejection;
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
  });
  it('rejects missing or revoked target membership before any fresh credential is returned', async () => {
    const f = setup();
    f.memberships.getUserWorkspaceForUserOrThrow.mockRejectedValue(
      Error('Membership revoked'),
    );
    await expect(
      f.resolver.getAuthTokensFromLoginToken(
        { loginToken: 'fixture' },
        'https://crm.example.test',
        { req: f.request },
      ),
    ).rejects.toThrow('Membership revoked');
    expect(f.login.consumeLoginTokenOrThrow).not.toHaveBeenCalled();
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
  });
  it('redeems a workspace-scoped native SSO exchange into an agnostic cookie and a bound native LOGIN for MFA', async () => {
    const f = setup();
    const result = await f.resolver.getAuthTokensFromSSOExchangeToken(
      { ssoExchangeToken: 'opaque-native-fixture' },
      { req: f.request },
    );
    expect(result).toMatchObject({
      tokens: tokenPair,
      workspaceLoginToken: { token: 'native-bound-login-fixture' },
    });
    expect(f.login.generateLoginToken).toHaveBeenCalledWith(
      f.user.email,
      B,
      AuthProviderEnum.SSO,
      { sameOriginSessionHash: H },
    );
    expect(f.sessions.issueSessionForTokenPair).not.toHaveBeenCalled();
    expect(f.login.createSameOriginAgnosticSession).toHaveBeenCalledWith(
      U,
      AuthProviderEnum.SSO,
      f.request,
    );
  });
  it('keeps global SSO exchange workspace-agnostic until the user chooses an authorized company', async () => {
    const f = setup();
    f.exchange.validateAndConsumeSsoExchangeTokenOrThrow.mockResolvedValue({
      userId: U,
      authProvider: AuthProviderEnum.Google,
    } as never);
    expect(
      await f.resolver.getAuthTokensFromSSOExchangeToken(
        { ssoExchangeToken: 'opaque-native-fixture' },
        { req: f.request },
      ),
    ).toEqual({ tokens: tokenPair });
    expect(f.login.generateLoginToken).not.toHaveBeenCalled();
  });
  it('refuses a provider disabled in the target company even after a valid OAuth exchange', async () => {
    const f = setup();
    f.exchange.validateAndConsumeSsoExchangeTokenOrThrow.mockResolvedValue({
      userId: U,
      workspaceId: B,
      authProvider: AuthProviderEnum.Google,
    });
    await expect(
      f.resolver.getAuthTokensFromSSOExchangeToken(
        { ssoExchangeToken: 'opaque-native-fixture' },
        { req: f.request },
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.OAUTH_ACCESS_DENIED });
    expect(f.login.generateLoginToken).not.toHaveBeenCalled();
  });
  it('rejects a malicious exchange origin before consuming the native opaque proof', async () => {
    const f = setup();
    await expect(
      f.resolver.getAuthTokensFromSSOExchangeToken(
        { ssoExchangeToken: 'opaque-native-fixture' },
        { req: { headers: { origin: 'https://evil.test' } } as Request },
      ),
    ).rejects.toMatchObject({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION });
    expect(
      f.exchange.validateAndConsumeSsoExchangeTokenOrThrow,
    ).not.toHaveBeenCalled();
  });
});
