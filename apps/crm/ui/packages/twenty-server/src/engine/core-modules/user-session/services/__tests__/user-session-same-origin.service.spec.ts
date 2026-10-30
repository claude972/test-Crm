import { randomUUID, randomBytes } from 'node:crypto';
import { type Request } from 'express';
import { FindOperator } from 'typeorm';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';
import { UserSessionEntity } from 'src/engine/core-modules/user-session/user-session.entity';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { hashUserSessionToken } from 'src/engine/core-modules/user-session/utils/hash-user-session-token.util';
import { UserSessionRevokedReason } from 'src/engine/core-modules/user-session/types/user-session-revoked-reason.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { AuthExceptionCode } from 'src/engine/core-modules/auth/auth.exception';
jest.mock('src/engine/core-modules/user-session/user-session.entity', () => ({
  UserSessionEntity: class UserSessionEntity {},
}));
jest.mock('src/engine/core-modules/user/user.entity', () => ({
  UserEntity: class UserEntity {},
}));
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock('src/engine/core-modules/app-token/app-token.entity', () => ({
  AppTokenEntity: class {},
  AppTokenType: {},
}));
jest.mock(
  'src/engine/core-modules/event-logs/emit/event-log-emitter.service',
  () => ({ EventLogEmitterService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));
jest.mock(
  'src/engine/core-modules/user-session/services/user-session-cookie.service',
  () => ({ UserSessionCookieService: class {} }),
);
const U = randomUUID(),
  A = randomUUID(),
  B = randomUUID(),
  M = randomUUID();
type Row = Record<string, unknown>;
const matches = (row: Row, where: Row) =>
  Object.entries(where).every(([key, value]) =>
    value instanceof FindOperator && value.type === 'isNull'
      ? row[key] === null || row[key] === undefined
      : row[key] === value,
  );
const setup = (enabled = true) => {
  let memberAlive = true,
    userAlive = true,
    providerAllowed = true;
  const token = randomBytes(32).toString('hex'),
    hash = hashUserSessionToken(token);
  const previous: Row = {
    id: randomUUID(),
    tokenHash: hash,
    userId: U,
    workspaceId: A,
    userWorkspaceId: M,
    authProvider: AuthProviderEnum.Password,
    isImpersonating: false,
    revokedAt: null,
    revokedReason: null,
    expiresAt: new Date(Date.now() + 3600000),
    lastActiveAt: new Date(),
    createdAt: new Date(),
  };
  const rows = new Map([[String(previous.id), previous]]);
  const repository = {
    create: jest.fn((row: Row) => row),
    save: jest.fn(async (row: Row) => {
      const saved = {
        id: randomUUID(),
        createdAt: new Date(),
        revokedAt: null,
        ...row,
      };
      rows.set(String(saved.id), saved);
      return saved;
    }),
    findOne: jest.fn(async ({ where }: { where: Row }) => {
      const row = [...rows.values()].find((candidate) =>
        matches(candidate, where),
      );
      return row ? { ...row } : null;
    }),
    findOneBy: jest.fn(async (where: Row) => {
      const row = [...rows.values()].find((candidate) =>
        matches(candidate, where),
      );
      return row ? { ...row } : null;
    }),
    update: jest.fn(async (where: Row, patch: Row) => {
      let affected = 0;
      for (const row of rows.values())
        if (matches(row, where)) {
          Object.assign(row, patch);
          affected++;
        }
      return { affected };
    }),
  };
  const users = {
    findOneBy: jest.fn(async () => (userAlive ? { id: U } : null)),
  };
  const memberships = {
    findOne: jest.fn(async () =>
      memberAlive
        ? { id: M, workspace: { isPasswordAuthEnabled: providerAllowed } }
        : null,
    ),
  };
  let entered: (() => void) | undefined, gate: Promise<void> | undefined;
  const manager = {
    getRepository: (entity: unknown) =>
      entity === UserSessionEntity
        ? repository
        : entity === UserEntity
          ? users
          : memberships,
    query: jest.fn(async () => {
      entered?.();
      if (gate) await gate;
    }),
  };
  let chain: Promise<unknown> = Promise.resolve();
  const repositoryWithManager = {
    ...repository,
    manager: {
      transaction: <T>(work: (transaction: typeof manager) => Promise<T>) => {
        const next = chain.then(async () => {
          const snapshot = structuredClone(rows);
          try {
            return await work(manager);
          } catch (error) {
            rows.clear();
            for (const [id, row] of snapshot) rows.set(id, row);
            throw error;
          }
        });
        chain = next.catch(() => {});
        return next;
      },
    },
  };
  const settings: Record<string, unknown> = {
    IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: enabled,
    IS_MULTIWORKSPACE_ENABLED: false,
    SERVER_URL: 'https://api.example.test',
    FRONTEND_URL: 'https://crm.example.test',
    AUTH_COOKIE_ALLOWED_ORIGINS: '',
    NODE_ENV: 'production',
    SESSION_ABSOLUTE_LIFETIME: '1d',
    SESSION_IDLE_TIMEOUT: '1h',
  };
  const cookies = {
    extractSessionTokenFromRequest: (req: Request) => req.headers.cookie,
    attachSessionTokenToResponse: jest.fn(),
  };
  const cache = { del: jest.fn().mockResolvedValue(undefined) };
  const jwt = { decode: (raw: string) => JSON.parse(raw) };
  const events = { createContext: () => ({ insertWorkspaceEvent: jest.fn() }) };
  const service = new UserSessionService(
    repositoryWithManager as never,
    {} as never,
    cache as never,
    { get: (key: string) => settings[key] } as never,
    jwt as never,
    events as never,
    cookies as never,
  );
  const request = {
    headers: { origin: 'https://crm.example.test', cookie: token },
    res: {},
    protocol: 'https',
    get: () => 'api.example.test',
  } as unknown as Request;
  const tokens = (workspaceId = B) => ({
    accessOrWorkspaceAgnosticToken: {
      token: JSON.stringify({
        type: JwtTokenTypeEnum.ACCESS,
        sub: U,
        userId: U,
        workspaceId,
        userWorkspaceId: M,
        authProvider: AuthProviderEnum.Password,
      }),
      expiresAt: new Date(),
    },
    refreshToken: { token: 'native-refresh-fixture', expiresAt: new Date() },
  });
  return {
    service,
    repository,
    rows,
    previous,
    hash,
    token,
    request,
    tokens,
    cookies,
    cache,
    manager,
    settings,
    revokeMember: () => {
      memberAlive = false;
    },
    disableUser: () => {
      userAlive = false;
    },
    disableProvider: () => {
      providerAllowed = false;
    },
    block: () => {
      let start!: () => void, finish!: () => void;
      const started = new Promise<void>((resolve) => {
        start = resolve;
      });
      gate = new Promise<void>((resolve) => {
        finish = resolve;
      });
      entered = start;
      return { started, finish };
    },
  };
};
describe('atomic native same-origin session replacement', () => {
  it('holds the source native session on the same transaction connection during workspace creation', async () => {
    const f = setup();
    const actor = {
      sessionHash: f.hash,
      userId: U,
      workspaceId: A,
      userWorkspaceId: M,
    };
    await expect(
      f.service.assertSameOriginWorkspaceSession(actor, f.manager as never),
    ).resolves.toBeUndefined();
    expect(f.repository.findOne).toHaveBeenCalledWith({
      where: {
        tokenHash: f.hash,
        userId: U,
        workspaceId: A,
        userWorkspaceId: M,
      },
      lock: { mode: 'pessimistic_read' },
    });
    f.previous.revokedAt = new Date();
    await expect(
      f.service.assertSameOriginWorkspaceSession(actor, f.manager as never),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(f.repository.save).not.toHaveBeenCalled();
  });

  it('commits one scoped replacement and revokes the old session before returning a cookie', async () => {
    const {
      service,
      repository,
      rows,
      previous,
      hash,
      request,
      tokens,
      cookies,
      cache,
    } = setup();
    const result = await service.issueSessionForTokenPair({
      tokenPair: tokens(),
      request,
      origin: 'sign_in',
      expectedSessionHash: hash,
    });
    expect(rows.get(String(previous.id))).toMatchObject({
      revokedReason: UserSessionRevokedReason.Superseded,
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(cookies.attachSessionTokenToResponse).toHaveBeenCalledWith(
      request.res,
      result.sessionToken,
      expect.any(Date),
    );
    expect(cache.del).toHaveBeenCalledWith(hash);
    expect([...rows.values()].filter((row) => row.revokedAt == null)).toEqual([
      expect.objectContaining({ workspaceId: B }),
    ]);
  });
  it('serializes two delayed A/B exchanges from the same cookie and never overwrites the winning company', async () => {
    const { service, hash, request, tokens, cookies, rows } = setup();
    const results = await Promise.allSettled([
      service.issueSessionForTokenPair({
        tokenPair: tokens(B),
        request,
        origin: 'sign_in',
        expectedSessionHash: hash,
      }),
      service.issueSessionForTokenPair({
        tokenPair: tokens(A),
        request,
        origin: 'sign_in',
        expectedSessionHash: hash,
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({
          code: AuthExceptionCode.SESSION_SUPERSEDED,
        }),
      }),
    ]);
    expect(cookies.attachSessionTokenToResponse).toHaveBeenCalledTimes(1);
    expect([...rows.values()].filter((row) => row.revokedAt == null)).toEqual([
      expect.objectContaining({ workspaceId: B }),
    ]);
  });
  it.each(['revokeMember', 'disableUser', 'disableProvider'] as const)(
    'rechecks %s after the session lock before creating a replacement',
    async (change) => {
      const fixture = setup();
      const gate = fixture.block();
      const pending = fixture.service.issueSessionForTokenPair({
        tokenPair: fixture.tokens(),
        request: fixture.request,
        origin: 'sign_in',
        expectedSessionHash: fixture.hash,
      });
      const rejection = expect(pending).rejects.toBeDefined();
      await gate.started;
      fixture[change]();
      gate.finish();
      await rejection;
      expect(fixture.repository.save).not.toHaveBeenCalled();
      expect(
        fixture.cookies.attachSessionTokenToResponse,
      ).not.toHaveBeenCalled();
    },
  );
  it('fails a revoked source session after waiting for the lock without any cookie or tenant insert', async () => {
    const fixture = setup();
    const gate = fixture.block();
    const pending = fixture.service.issueSessionForTokenPair({
      tokenPair: fixture.tokens(),
      request: fixture.request,
      origin: 'sign_in',
      expectedSessionHash: fixture.hash,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    await gate.started;
    fixture.previous.revokedAt = new Date();
    fixture.previous.revokedReason = UserSessionRevokedReason.Superseded;
    gate.finish();
    await rejection;
    expect(fixture.repository.save).not.toHaveBeenCalled();
    expect(fixture.cookies.attachSessionTokenToResponse).not.toHaveBeenCalled();
  });
  it('leaves the working credential unchanged when replacement insertion fails', async () => {
    const fixture = setup();
    fixture.repository.save.mockRejectedValueOnce(Error('Insert failed'));
    await expect(
      fixture.service.issueSessionForTokenPair({
        tokenPair: fixture.tokens(),
        request: fixture.request,
        origin: 'sign_in',
        expectedSessionHash: fixture.hash,
      }),
    ).rejects.toThrow('Insert failed');
    expect(fixture.rows.get(String(fixture.previous.id))?.revokedAt).toBeNull();
    expect(fixture.cookies.attachSessionTokenToResponse).not.toHaveBeenCalled();
  });
  it('does not let an old A refresh bridge replace the current B cookie', async () => {
    const fixture = setup();
    jest.spyOn(fixture.service, 'resolveSession').mockResolvedValue({
      payload: {
        type: JwtTokenTypeEnum.ACCESS,
        sub: U,
        userId: U,
        workspaceId: B,
        userWorkspaceId: M,
        authProvider: AuthProviderEnum.Password,
      },
      authenticatedAt: new Date(),
      expiresAt: new Date(),
    });
    await expect(
      fixture.service.issueSessionForTokenPair({
        tokenPair: fixture.tokens(A),
        request: fixture.request,
        origin: 'renewal_bridge',
      }),
    ).rejects.toMatchObject({ code: AuthExceptionCode.SESSION_SUPERSEDED });
    expect(fixture.repository.save).not.toHaveBeenCalled();
    expect(fixture.cookies.attachSessionTokenToResponse).not.toHaveBeenCalled();
  });
  it('keeps the same cookie during a matching native renewal, so pending MFA bindings remain valid', async () => {
    const fixture = setup();
    jest.spyOn(fixture.service, 'resolveSession').mockResolvedValue({
      payload: {
        type: JwtTokenTypeEnum.ACCESS,
        sub: U,
        userId: U,
        workspaceId: A,
        userWorkspaceId: M,
        authProvider: AuthProviderEnum.Password,
        isImpersonating: false,
      },
      authenticatedAt: new Date(),
      expiresAt: new Date(),
    });
    expect(
      await fixture.service.issueSessionForTokenPair({
        tokenPair: fixture.tokens(A),
        request: fixture.request,
        origin: 'renewal_bridge',
      }),
    ).toEqual({ sessionToken: fixture.token });
    expect(fixture.repository.save).not.toHaveBeenCalled();
    expect(fixture.cookies.attachSessionTokenToResponse).not.toHaveBeenCalled();
  });
  it('preserves the legacy renewal bridge when the opt-in is disabled', async () => {
    const fixture = setup(false);
    jest.spyOn(fixture.service, 'resolveSession').mockResolvedValue({
      payload: {
        type: JwtTokenTypeEnum.ACCESS,
        sub: U,
        userId: U,
        workspaceId: A,
        userWorkspaceId: M,
        authProvider: AuthProviderEnum.Password,
      },
      authenticatedAt: new Date(),
      expiresAt: new Date(),
    });
    await fixture.service.issueSessionForTokenPair({
      tokenPair: fixture.tokens(B),
      request: fixture.request,
      origin: 'renewal_bridge',
    });
    expect(fixture.cookies.attachSessionTokenToResponse).toHaveBeenCalledTimes(
      1,
    );
  });
});
