import { isCanonicalFrontendOrigin } from 'src/engine/core-modules/domain/workspace-domains/utils/is-canonical-frontend-origin.util';
import { Injectable } from '@nestjs/common';

import crypto from 'crypto';
import { type Request } from 'express';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';
import { hashUserSessionToken } from 'src/engine/core-modules/user-session/utils/hash-user-session-token.util';
import { WorkspaceAgnosticTokenService } from 'src/engine/core-modules/auth/token/services/workspace-agnostic-token.service';
import { RefreshTokenService } from 'src/engine/core-modules/auth/token/services/refresh-token.service';

import { addMilliseconds } from 'date-fns';
import ms from 'ms';
import { isNonEmptyString } from '@sniptt/guards';

import { CONSUMED_LOGIN_TOKEN_CACHE_KEY_PREFIX } from 'src/engine/core-modules/auth/constants/consumed-login-token-cache-key-prefix.constant';
import { type AuthToken } from 'src/engine/core-modules/auth/dto/auth-token.dto';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type LoginTokenJwtPayload } from 'src/engine/core-modules/auth/types/login-token-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';

@Injectable()
export class LoginTokenService {
  constructor(
    private readonly jwtWrapperService: JwtWrapperService,
    private readonly kovaaLabConfigService: KovaaLabCRMConfigService,
    @InjectCacheStorage(CacheStorageNamespace.EngineAuthSession)
    private readonly cacheStorage: CacheStorageService,
    private readonly sessions: UserSessionService,
    private readonly cookies: UserSessionCookieService,
    private readonly workspaceAgnosticTokens: WorkspaceAgnosticTokenService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  private isSameOriginMode(): boolean {
    return (
      this.kovaaLabConfigService.get('IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED') &&
      !this.kovaaLabConfigService.get('IS_MULTIWORKSPACE_ENABLED')
    );
  }

  async getSameOriginSessionBinding(
    request: Request | undefined,
    userId: string,
    expectedWorkspaceId?: string,
    issuedSessionToken?: string,
  ): Promise<string | undefined> {
    if (!this.isSameOriginMode()) return undefined;
    if (
      !isCanonicalFrontendOrigin(
        request?.headers.origin,
        this.kovaaLabConfigService.get('FRONTEND_URL') ??
          this.kovaaLabConfigService.get('SERVER_URL'),
      )
    )
      throw new AuthException(
        'The request origin is not allowed',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    const sessionToken =
      issuedSessionToken ??
      (request && this.cookies.extractSessionTokenFromRequest(request));
    if (!sessionToken)
      throw new AuthException(
        'A native browser session is required',
        AuthExceptionCode.UNAUTHENTICATED,
      );
    const { payload } = await this.sessions.resolveSession(sessionToken);
    if (
      (payload.userId ?? payload.sub) !== userId ||
      (expectedWorkspaceId !== undefined &&
        (!('workspaceId' in payload) ||
          payload.workspaceId !== expectedWorkspaceId)) ||
      ('isImpersonating' in payload && payload.isImpersonating)
    )
      throw new AuthException(
        'The workspace session changed',
        AuthExceptionCode.SESSION_SUPERSEDED,
      );
    return hashUserSessionToken(sessionToken);
  }

  async assertSameOriginSessionForLoginToken(
    payload: LoginTokenJwtPayload,
    request: Request,
  ): Promise<void> {
    if (!this.isSameOriginMode()) return;
    if (
      !isCanonicalFrontendOrigin(
        request.headers.origin,
        this.kovaaLabConfigService.get('FRONTEND_URL') ??
          this.kovaaLabConfigService.get('SERVER_URL'),
      )
    )
      throw new AuthException(
        'The request origin is not allowed',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    const token = this.cookies.extractSessionTokenFromRequest(request);
    if (
      !token ||
      !/^[a-f0-9]{64}$/.test(payload.sameOriginSessionHash ?? '') ||
      !crypto.timingSafeEqual(
        Buffer.from(hashUserSessionToken(token), 'hex'),
        Buffer.from(payload.sameOriginSessionHash!, 'hex'),
      )
    )
      throw new AuthException(
        'The login session was replaced',
        AuthExceptionCode.SESSION_SUPERSEDED,
      );
    const { payload: session } = await this.sessions.resolveSession(token);
    if (
      session.authProvider !== payload.authProvider ||
      ('isImpersonating' in session && session.isImpersonating)
    )
      throw new AuthException(
        'The login session is unavailable',
        AuthExceptionCode.SESSION_SUPERSEDED,
      );
  }

  async createSameOriginAgnosticSession(
    userId: string,
    provider: AuthProviderEnum,
    request: Request,
  ) {
    if (
      !this.isSameOriginMode() ||
      !isCanonicalFrontendOrigin(
        request.headers.origin,
        this.kovaaLabConfigService.get('FRONTEND_URL') ??
          this.kovaaLabConfigService.get('SERVER_URL'),
      )
    )
      throw new AuthException(
        'Same-origin authentication is not allowed',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    const tokens = {
      accessOrWorkspaceAgnosticToken:
        await this.workspaceAgnosticTokens.generateWorkspaceAgnosticToken({
          userId,
          authProvider: provider,
        }),
      refreshToken: await this.refreshTokens.generateRefreshToken({
        userId,
        authProvider: provider,
        targetedTokenType: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC,
      }),
    };
    const issued = await this.sessions.issueSessionForTokenPair({
      tokenPair: tokens,
      request,
      origin: 'sign_in',
    });
    const sameOriginSessionHash = await this.getSameOriginSessionBinding(
      request,
      userId,
      undefined,
      issued.sessionToken,
    );
    return { tokens, sameOriginSessionHash };
  }

  async generateLoginTokenForRequest(
    user: { id: string; email: string },
    workspaceId: string,
    provider: AuthProviderEnum,
    request: Request,
    preserveSession = false,
  ): Promise<AuthToken> {
    if (!this.isSameOriginMode())
      return this.generateLoginToken(user.email, workspaceId, provider);
    const sameOriginSessionHash = preserveSession
      ? await this.getSameOriginSessionBinding(request, user.id)
      : (await this.createSameOriginAgnosticSession(user.id, provider, request))
          .sameOriginSessionHash;
    return this.generateLoginToken(user.email, workspaceId, provider, {
      sameOriginSessionHash,
    });
  }

  async generateLoginToken(
    email: string,
    workspaceId: string,
    authProvider: AuthProviderEnum,
    options?: {
      impersonatorUserWorkspaceId?: string;
      sameOriginSessionHash?: string;
    },
  ): Promise<AuthToken> {
    if (!Object.values(AuthProviderEnum).includes(authProvider)) {
      throw new AuthException(
        'Authentication provider is required to generate a login token',
        AuthExceptionCode.INVALID_INPUT,
      );
    }

    if (
      this.isSameOriginMode() &&
      !/^[a-f0-9]{64}$/.test(options?.sameOriginSessionHash ?? '')
    )
      throw new AuthException(
        'A native session binding is required',
        AuthExceptionCode.UNAUTHENTICATED,
      );

    const jwtPayload: LoginTokenJwtPayload = {
      type: JwtTokenTypeEnum.LOGIN,
      sub: email,
      workspaceId,
      authProvider,
      impersonatorUserWorkspaceId: options?.impersonatorUserWorkspaceId,
      jti: crypto.randomUUID(),
      ...(this.isSameOriginMode()
        ? { sameOriginSessionHash: options?.sameOriginSessionHash }
        : {}),
    };

    const expiresIn = this.kovaaLabConfigService.get('LOGIN_TOKEN_EXPIRES_IN');

    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

    return {
      token: await this.jwtWrapperService.signAsyncOrThrow(jwtPayload, {
        expiresIn,
      }),
      expiresAt,
    };
  }

  async verifyLoginToken(loginToken: string): Promise<LoginTokenJwtPayload> {
    await this.jwtWrapperService.verifyJwtToken(loginToken);

    const decoded = this.jwtWrapperService.decode<LoginTokenJwtPayload>(
      loginToken,
      { json: true },
    );

    if (decoded.type !== JwtTokenTypeEnum.LOGIN) {
      throw new AuthException(
        'Expected a login token',
        AuthExceptionCode.INVALID_JWT_TOKEN_TYPE,
      );
    }

    if (!Object.values(AuthProviderEnum).includes(decoded.authProvider)) {
      throw new AuthException(
        'Login token has an invalid authentication provider',
        AuthExceptionCode.UNAUTHENTICATED,
      );
    }

    return decoded;
  }

  async consumeLoginTokenOrThrow({ jti }: LoginTokenJwtPayload): Promise<void> {
    if (!isNonEmptyString(jti)) {
      throw new AuthException(
        'Login token is missing its identifier',
        AuthExceptionCode.UNAUTHENTICATED,
      );
    }

    const isFirstUse = await this.cacheStorage.setIfAbsent(
      `${CONSUMED_LOGIN_TOKEN_CACHE_KEY_PREFIX}:${jti}`,
      true,
      ms(this.kovaaLabConfigService.get('LOGIN_TOKEN_EXPIRES_IN')),
    );

    if (!isFirstUse) {
      throw new AuthException(
        'Login token has already been used',
        AuthExceptionCode.UNAUTHENTICATED,
      );
    }
  }
}
