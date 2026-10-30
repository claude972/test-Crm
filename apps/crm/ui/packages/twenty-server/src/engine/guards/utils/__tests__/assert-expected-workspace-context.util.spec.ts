import { randomUUID } from 'node:crypto';
import { type Request } from 'express';
import { buildSchema, graphql } from 'graphql';
import { AuthExceptionCode } from 'src/engine/core-modules/auth/auth.exception';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import {
  assertExpectedWorkspaceContext,
  EXPECTED_WORKSPACE_HEADER,
} from 'src/engine/guards/utils/assert-expected-workspace-context.util';
const A = randomUUID(),
  B = randomUUID();
const config = (enabled = true, multiDomain = false) => ({
  get: (key: string) =>
    key === 'IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED'
      ? enabled
      : key === 'IS_MULTIWORKSPACE_ENABLED'
        ? multiDomain
        : undefined,
});
const request = (
  query = 'mutation { createOneCompany { id } }',
  expected: string | string[] | null = B,
  overrides: Record<string, unknown> = {},
) =>
  ({
    method: 'POST',
    path: '/metadata',
    headers: {
      ...(expected === null ? {} : { [EXPECTED_WORKSPACE_HEADER]: expected }),
    },
    body: { query },
    user: { id: 'owner' },
    workspace: { id: B },
    tokenType: JwtTokenTypeEnum.ACCESS,
    ...overrides,
  }) as unknown as Request;
const check = (req: Request, enabled = true, multiDomain = false) =>
  assertExpectedWorkspaceContext(
    req,
    config(enabled, multiDomain) as never,
    'graphql',
  );
describe('verified workspace intent header', () => {
  it('accepts a write only when the immutable client workspace matches the verified session workspace', () => {
    const req = request();
    expect(() => check(req)).not.toThrow();
    expect(req.workspace?.id).toBe(B);
  });
  it('does not let an A form create anything in B after the cookie switched', async () => {
    const writes: string[] = [];
    const schema = buildSchema(
      'type Company { id: ID! } type Query { ping: Boolean } type Mutation { createOneCompany: Company! }',
    );
    const result = await graphql({
      schema,
      source: 'mutation { createOneCompany { id } }',
      rootValue: {
        createOneCompany: () => {
          check(request(undefined, A));
          writes.push(B);
          return { id: randomUUID() };
        },
      },
    });
    expect(result.errors?.[0].originalError).toMatchObject({
      code: AuthExceptionCode.SESSION_SUPERSEDED,
    });
    expect(writes).toEqual([]);
  });
  it('requires the header on a tenant mutation but allows a header-free bootstrap read', () => {
    expect(() => check(request(undefined, null))).toThrow(
      expect.objectContaining({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION }),
    );
    expect(() =>
      check(request('query { currentUser { id } }', null)),
    ).not.toThrow();
  });
  it.each([A, ['a', 'b'], 'invalid'])(
    'rejects a stale or malformed read header %s',
    (expected) => {
      expect(() =>
        check(request('query { currentUser { id } }', expected)),
      ).toThrow(
        expect.objectContaining({ code: AuthExceptionCode.SESSION_SUPERSEDED }),
      );
    },
  );
  it.each([
    [false, false],
    [true, true],
  ])(
    'preserves native behavior when opt-in=%s multi-domain=%s',
    (enabled, multiDomain) => {
      expect(() =>
        check(request(undefined, null), enabled, multiDomain),
      ).not.toThrow();
    },
  );
  it.each([
    'mutation { signIn(email:"x",password:"x") { tokens { refreshToken { token } } } }',
    'mutation { aliased: getAuthTokensFromLoginToken(loginToken:"x",origin:"https://crm.example.test") { tokens { refreshToken { token } } } }',
    'mutation { ...Public } fragment Public on Mutation { signOut }',
  ])(
    'keeps canonical metadata public authentication under its own native token/CSRF guards',
    (query) => {
      expect(() => check(request(query, null))).not.toThrow();
    },
  );
  it('does not exempt a data API mutation merely because it is named like an auth field', () => {
    expect(() =>
      check(request('mutation { signIn }', null, { path: '/graphql' })),
    ).toThrow();
  });
  it('does not allow aliases or nested root fragments to disguise tenant writes as public authentication', () => {
    const query =
      'mutation { ...Public } fragment Public on Mutation { signOut ...Nested } fragment Nested on Mutation { signIn: createOneCompany { id } }';
    expect(() => check(request(query, null))).toThrow(
      expect.objectContaining({ code: AuthExceptionCode.FORBIDDEN_EXCEPTION }),
    );
  });
  it('selects the actual operation instead of inspecting an unrelated public operation in the document', () => {
    const req = request(
      'mutation Public { signOut } mutation Write { createOneCompany { id } }',
      null,
    );
    req.body.operationName = 'Write';
    expect(() => check(req)).toThrow();
  });
  it('does not infer an intent header from a client input workspace ID', () => {
    const req = request(undefined, null);
    req.body.variables = { workspaceId: B };
    expect(() => check(req)).toThrow();
    expect(req.workspace?.id).toBe(B);
  });
  it.each([
    {
      user: undefined,
      apiKey: { id: 'native-key' },
      tokenType: JwtTokenTypeEnum.API_KEY,
    },
    {
      user: undefined,
      application: { sourceType: 'NPM' },
      tokenType: JwtTokenTypeEnum.APPLICATION_ACCESS,
    },
    {
      user: { id: 'user' },
      application: { sourceType: 'OAUTH_ONLY' },
      tokenType: JwtTokenTypeEnum.APPLICATION_ACCESS,
    },
    { user: undefined, tokenType: undefined },
    { workspace: undefined, tokenType: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC },
  ])(
    'does not change fixed-scope API credentials, provider webhooks or workspace-agnostic bootstrap',
    (principal) => {
      expect(() => check(request(undefined, A, principal))).not.toThrow();
    },
  );
  it('covers authenticated REST and upload writes while keeping safe downloads header-optional', () => {
    const write = request(undefined, A);
    expect(() =>
      assertExpectedWorkspaceContext(write, config() as never, 'http'),
    ).toThrow();
    const read = request(undefined, null, { method: 'GET' });
    expect(() =>
      assertExpectedWorkspaceContext(read, config() as never, 'http'),
    ).not.toThrow();
  });
});
