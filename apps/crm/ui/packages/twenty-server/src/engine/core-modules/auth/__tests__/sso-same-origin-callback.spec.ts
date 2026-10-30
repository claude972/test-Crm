import { randomUUID } from 'node:crypto';
import { type Response } from 'express';
import { SsoAuthController } from 'src/engine/core-modules/auth/controllers/sso-auth.controller';
import {
  IdentityProviderType,
  SsoIdentityProviderStatus,
} from 'src/engine/core-modules/sso/workspace-sso-identity-provider.entity';
import { type SamlRequest } from 'src/engine/core-modules/auth/strategies/saml.auth.strategy';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
jest.mock('src/engine/core-modules/auth/services/auth.service', () => ({
  AuthService: class {},
}));
jest.mock(
  'src/engine/core-modules/auth/token/services/login-token.service',
  () => ({ LoginTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/auth/token/services/sso-exchange-token.service',
  () => ({ SsoExchangeTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/auth/guards/enterprise-features-enabled.guard',
  () => ({ EnterpriseFeaturesEnabledGuard: class {} }),
);
jest.mock('src/engine/core-modules/auth/guards/oidc-auth.guard', () => ({
  OidcAuthGuard: class {},
}));
jest.mock('src/engine/core-modules/auth/guards/saml-auth.guard', () => ({
  SamlAuthGuard: class {},
}));
jest.mock(
  'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service',
  () => ({ WorkspaceDomainsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/guard-redirect/services/guard-redirect.service',
  () => ({ GuardRedirectService: class {} }),
);
jest.mock('src/engine/core-modules/sso/services/sso.service', () => ({
  SsoService: class {},
}));
jest.mock('src/engine/core-modules/user/services/user.service', () => ({
  UserService: class {},
}));
jest.mock(
  'src/engine/core-modules/sso/workspace-sso-identity-provider.entity',
  () => ({
    WorkspaceSsoIdentityProviderEntity: class {},
    IdentityProviderType: { SAML: 'SAML' },
    SsoIdentityProviderStatus: { Active: 'ACTIVE' },
  }),
);
const A = randomUUID(),
  U = randomUUID();
const setup = () => {
  const workspace = { id: A };
  const user = {
    id: U,
    email: 'owner@example.test',
    isEmailVerified: true,
    passwordHash: 'synthetic',
  };
  const auth = {
    findWorkspaceForSignInUp: jest.fn().mockResolvedValue(workspace),
    findInvitationForSignInUp: jest.fn().mockResolvedValue(undefined),
    formatUserDataPayload: jest.fn().mockReturnValue({
      userData: { type: 'existingUser', existingUser: user },
    }),
    checkAccessForSignIn: jest.fn(),
    signInUp: jest.fn().mockResolvedValue({ workspace, user }),
    createSsoConnectedAccountIfFeatureFlagIsOn: jest.fn(),
  };
  const exchange = {
    generateSsoExchangeToken: jest.fn().mockResolvedValue({
      token: 'opaque-synthetic-proof',
      expiresAt: new Date(),
    }),
  };
  const login = { generateLoginToken: jest.fn() };
  const domains = {
    isSameOriginMultiWorkspaceEnabled: () => true,
    buildWorkspaceURL: jest
      .fn()
      .mockReturnValue(
        new URL(
          'https://crm.example.test/sign-in-up#ssoExchangeToken=opaque-synthetic-proof',
        ),
      ),
    getSubdomainAndCustomDomainFromWorkspaceFallbackOnDefaultSubdomain:
      jest.fn(),
  };
  const guardRedirect = {
    getRedirectErrorUrlAndCaptureExceptions: jest
      .fn()
      .mockReturnValue('https://crm.example.test/error'),
  };
  const provider = {
    id: randomUUID(),
    workspaceId: A,
    workspace,
    type: IdentityProviderType.SAML,
    status: SsoIdentityProviderStatus.Active,
  };
  const controller = Object.create(
    SsoAuthController.prototype,
  ) as SsoAuthController;
  Object.assign(controller, {
    authService: auth,
    ssoExchangeTokenService: exchange,
    loginTokenService: login,
    workspaceDomainsService: domains,
    guardRedirectService: guardRedirect,
    userService: { findUserByEmail: jest.fn().mockResolvedValue(user) },
    workspaceSsoIdentityProviderRepository: {
      findOne: jest.fn().mockResolvedValue(provider),
    },
  });
  const request = {
    headers: { origin: 'https://idp.example.test' },
    user: { email: user.email, identityProviderId: provider.id },
  } as unknown as SamlRequest;
  const response = { redirect: jest.fn() } as unknown as Response;
  return {
    controller,
    auth,
    exchange,
    login,
    domains,
    guardRedirect,
    provider,
    request,
    response,
  };
};
describe('native IdP callback in same-origin mode', () => {
  it('keeps the IdP proof scoped to its own workspace and redirects with a native opaque exchange fragment', async () => {
    const f = setup();
    await f.controller.samlAuthCallback(f.request, f.response);
    expect(f.exchange.generateSsoExchangeToken).toHaveBeenCalledWith({
      userId: U,
      workspaceId: A,
      authProvider: AuthProviderEnum.SSO,
    });
    expect(f.login.generateLoginToken).not.toHaveBeenCalled();
    expect(f.response.redirect).toHaveBeenCalledWith(
      'https://crm.example.test/sign-in-up#ssoExchangeToken=opaque-synthetic-proof',
    );
  });
  it('rejects an identity provider that resolves another workspace before minting any exchange or LOGIN', async () => {
    const f = setup();
    f.auth.findWorkspaceForSignInUp.mockResolvedValue({ id: randomUUID() });
    await f.controller.samlAuthCallback(f.request, f.response);
    expect(f.exchange.generateSsoExchangeToken).not.toHaveBeenCalled();
    expect(f.login.generateLoginToken).not.toHaveBeenCalled();
    expect(
      f.guardRedirect.getRedirectErrorUrlAndCaptureExceptions,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Identity provider does not belong to this workspace',
        }),
      }),
    );
  });
  it('does not accept an inactive IdP even with an authenticated-looking user payload', async () => {
    const f = setup();
    f.provider.status = 'INACTIVE' as never;
    await f.controller.samlAuthCallback(f.request, f.response);
    expect(f.exchange.generateSsoExchangeToken).not.toHaveBeenCalled();
    expect(f.auth.signInUp).not.toHaveBeenCalled();
  });
});
