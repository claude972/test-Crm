import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { USER_SESSION_COOKIE_NAME } from 'src/engine/core-modules/user-session/constants/user-session-cookie-name.constant';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';

// Guard at import time too: the wrapper must validate before the native destructive reset.
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED, 'true');
assert.equal(process.env.IS_MULTIWORKSPACE_ENABLED, 'false');
const database = new URL(process.env.PG_DATABASE_URL ?? '');
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');

const A = SEED_APPLE_WORKSPACE_ID;
const C = SEED_YCOMBINATOR_WORKSPACE_ID;
const userId = randomUUID();
const email = `tenancy-${userId}@example.com`;
const password = randomBytes(24).toString('base64url');
const CURRENT = 'query { currentUser { id currentWorkspace { id } } }';
type Result = {
  data?: Record<string, any>;
  errors?: {
    message: string;
    extensions?: { code?: string; subCode?: string };
  }[];
};
const ok = (body: Result) => {
  // Never dump bodies containing native login/session credentials into CI output.
  if (body.errors?.length || !body.data)
    throw new Error(
      `Native tenancy operation failed: ${body.errors?.map((e) => e.extensions?.code ?? 'GRAPHQL_ERROR').join(',')}`,
    );
  return body.data;
};

describe('same-origin native multiworkspace with real PostgreSQL and cookie sessions', () => {
  let origin: string;
  let cookie: string | undefined;
  let B: string | undefined;
  let sourceRecord: string | undefined;
  const call = async (
    query: string,
    variables: object = {},
    expected?: string,
    endpoint = '/metadata',
    bearer?: string,
    requestOrigin?: string,
  ) => {
    let req = request(`http://127.0.0.1:${APP_PORT}`)
      .post(endpoint)
      .set('Origin', requestOrigin ?? origin);
    if (cookie) req = req.set('Cookie', cookie);
    if (expected) req = req.set('X-Expected-Workspace-Id', expected);
    if (bearer) req = req.set('Authorization', `Bearer ${bearer}`);
    const response = await req.send({ query, variables });
    const setCookie = response.headers['set-cookie'];
    const cookies: string[] =
      typeof setCookie === 'string' ? [setCookie] : (setCookie ?? []);
    const next = cookies.find((value) =>
      value.startsWith(`${USER_SESSION_COOKIE_NAME}=`),
    );
    if (next) cookie = next.split(';')[0];
    return { status: response.status, body: response.body as Result };
  };
  const exchange = async (loginToken: string) =>
    ok(
      (
        await call(
          'mutation($loginToken:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }',
          { loginToken, origin },
        )
      ).body,
    ).getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken
      .token as string;
  const select = async (current: string, target: string) =>
    ok(
      (
        await call(
          'mutation($input:SelectWorkspaceOnSameOriginInput!){selectWorkspaceOnSameOrigin(input:$input){loginToken{token} workspace{id}}}',
          { input: { workspaceId: target, expectedWorkspaceId: current } },
          current,
        )
      ).body,
    ).selectWorkspaceOnSameOrigin.loginToken.token as string;
  const records = async (expected: string, recordId = sourceRecord) =>
    ok(
      (
        await call(
          'query($filter:CompanyFilterInput!){companies(filter:$filter,first:2){edges{node{id}}}}',
          { filter: { id: { eq: recordId } } },
          expected,
          '/graphql',
        )
      ).body,
    ).companies.edges;

  beforeAll(async () => {
    const config = getAppProviderByClassName<KovaaLabCRMConfigService>(
      'KovaaLabCRMConfigService',
    );
    origin = config.get('FRONTEND_URL');
    expect(config.get('IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED')).toBe(true);
    expect(config.get('IS_MULTIWORKSPACE_ENABLED')).toBe(false);
    const workspace = await getCoreRepository<WorkspaceEntity>(
      WorkspaceEntity,
    ).findOneByOrFail({ id: A });
    const role = await getAppProviderByClassName<RoleService>(
      'RoleService',
    ).getRoleByUniversalIdentifier({
      workspaceId: A,
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
    });
    assert.ok(role);
    const user = await getCoreRepository<UserEntity>(UserEntity).save({
      id: userId,
      email,
      firstName: 'Synthetic',
      lastName: 'Tenancy',
      locale: 'fr',
      passwordHash: await hashPassword(password),
      isEmailVerified: true,
      disabled: false,
      canAccessFullAdminPanel: true,
      canImpersonate: false,
    });
    await getAppProviderByClassName<UserWorkspaceService>(
      'UserWorkspaceService',
    ).addUserToWorkspaceIfUserNotInWorkspace(user, workspace, role.id);
  }, 120_000);

  afterAll(async () => {
    // Only this suite's owned fixtures; all services are disposable, but never touch other tenants.
    if (B)
      await getAppProviderByClassName<WorkspaceService>(
        'WorkspaceService',
      ).deleteWorkspace(B);
    if (sourceRecord && cookie) {
      // The source record belongs to the synthetic fixture, never to a seeded customer.
      const membership = await getCoreRepository<UserWorkspaceEntity>(
        UserWorkspaceEntity,
      ).findOneBy({ userId, workspaceId: A });
      if (membership) {
        // A final password sign-in restores a valid native source session after revocation tests.
        cookie = undefined;
        const signed = ok(
          (
            await call(
              'mutation($email:String!,$password:String!){signIn(email:$email,password:$password){availableWorkspaces{availableWorkspacesForSignIn{id loginToken}}}}',
              { email, password },
            )
          ).body,
        ).signIn;
        const token =
          signed.availableWorkspaces.availableWorkspacesForSignIn.find(
            (w: { id: string }) => w.id === A,
          )?.loginToken;
        if (token) {
          await exchange(token);
          await call(
            'mutation($id:UUID!){deleteCompany(id:$id){id}}',
            { id: sourceRecord },
            A,
            '/graphql',
          );
        }
      }
    }
    const membership = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).findOneBy({ userId, workspaceId: A });
    if (membership)
      await getAppProviderByClassName<UserWorkspaceService>(
        'UserWorkspaceService',
      ).deleteUserWorkspace({
        userWorkspaceId: membership.id,
        workspaceId: A,
        softDelete: false,
      });
    await getCoreRepository<UserEntity>(UserEntity).delete(userId);
  }, 180_000);

  it('creates B natively, switches and reloads, isolates records, rejects stale intent and revoked membership', async () => {
    const signed = ok(
      (
        await call(
          'mutation($email:String!,$password:String!){signIn(email:$email,password:$password){availableWorkspaces{availableWorkspacesForSignIn{id loginToken}}}}',
          { email, password },
        )
      ).body,
    ).signIn;
    const login = signed.availableWorkspaces.availableWorkspacesForSignIn.find(
      (w: { id: string }) => w.id === A,
    )?.loginToken;
    assert.ok(login);
    assert.ok(cookie);
    const bearerA = await exchange(login);
    expect(ok((await call(CURRENT)).body).currentUser.currentWorkspace.id).toBe(
      A,
    );
    sourceRecord = randomUUID();
    expect(
      ok(
        (
          await call(
            'mutation($data:CompanyCreateInput!){createCompany(data:$data){id}}',
            {
              data: { id: sourceRecord, name: `Synthetic isolation ${userId}` },
            },
            A,
            '/graphql',
          )
        ).body,
      ).createCompany.id,
    ).toBe(sourceRecord);
    const capability = ok(
      (
        await call(
          'query { sameOriginWorkspaceCapabilities { enabled canCreateWorkspace } }',
        )
      ).body,
    ).sameOriginWorkspaceCapabilities;
    expect(capability).toEqual({ enabled: true, canCreateWorkspace: true });
    const created = ok(
      (
        await call(
          'mutation($input:CreateWorkspaceOnSameOriginInput!){createWorkspaceOnSameOrigin(input:$input){loginToken{token} workspace{id workspaceUrls{subdomainUrl}}}}',
          {
            input: {
              displayName: `Synthetic tenant ${userId}`,
              expectedWorkspaceId: A,
            },
          },
          A,
        )
      ).body,
    ).createWorkspaceOnSameOrigin;
    B = created.workspace.id;
    assert.ok(B && B !== A);
    expect(new URL(created.workspace.workspaceUrls.subdomainUrl).origin).toBe(
      origin,
    );
    expect(
      await getCoreRepository<UserWorkspaceEntity>(UserWorkspaceEntity).countBy(
        { userId, workspaceId: B },
      ),
    ).toBe(1);
    await exchange(created.loginToken.token);
    expect(ok((await call(CURRENT)).body).currentUser.currentWorkspace.id).toBe(
      B,
    );
    ok(
      (
        await call(
          'mutation($input:ActivateWorkspaceInput!){activateWorkspace(data:$input){id activationStatus}}',
          { input: {} },
          B,
        )
      ).body,
    );
    // A fresh request reloads from the native cookie; no UI-local tenant state is used.
    expect(ok((await call(CURRENT)).body).currentUser.currentWorkspace.id).toBe(
      B,
    );
    expect(await records(B)).toEqual([]);
    const attemptedRecordId = randomUUID();
    const forged = await call(
      'mutation($data:CompanyCreateInput!){createCompany(data:$data){id}}',
      { data: { id: attemptedRecordId, name: 'Stale A form' } },
      A,
      '/graphql',
      bearerA,
    );
    expect(forged.body.errors?.map((error) => error.extensions)).toContainEqual(
      expect.objectContaining({
        code: 'UNAUTHENTICATED',
        subCode: 'SESSION_SUPERSEDED',
      }),
    );
    expect(await records(B!, attemptedRecordId)).toEqual([]);
    expect(
      (
        await call(
          'mutation($input:SelectWorkspaceOnSameOriginInput!){selectWorkspaceOnSameOrigin(input:$input){workspace{id}}}',
          { input: { workspaceId: C, expectedWorkspaceId: B } },
          B,
        )
      ).body.errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (
        await call(
          'mutation($input:CreateWorkspaceOnSameOriginInput!){createWorkspaceOnSameOrigin(input:$input){workspace{id}}}',
          {
            input: {
              displayName: 'Missing tenant intent',
              expectedWorkspaceId: B,
            },
          },
        )
      ).body.errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (
        await call(
          CURRENT,
          {},
          undefined,
          '/metadata',
          undefined,
          'https://evil.example.test',
        )
      ).status,
    ).toBe(403);
    const lateA = await select(B!, A);
    const otherA = await select(B!, A);
    // A genuine signed ACCESS token is still the wrong credential purpose for LOGIN.
    for (const invalidLogin of [bearerA, 'invalid-native-login-fixture']) {
      const refused = await call(
        'mutation($loginToken:String!,$origin:String!){getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin){tokens{refreshToken{token}}}}',
        { loginToken: invalidLogin, origin },
      );
      expect(refused.body.errors?.length).toBeGreaterThan(0);
      expect(
        ok((await call(CURRENT)).body).currentUser.currentWorkspace.id,
      ).toBe(B);
    }
    await exchange(otherA);
    expect(await records(A, attemptedRecordId)).toEqual([]);
    expect(
      (await records(A)).map((edge: { node: { id: string } }) => edge.node.id),
    ).toEqual([sourceRecord]);
    await exchange(await select(A, B!));
    const stale = await call(
      'mutation($loginToken:String!,$origin:String!){getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin){tokens{refreshToken{token}}}}',
      { loginToken: lateA, origin },
    );
    expect(stale.body.errors?.length).toBeGreaterThan(0);
    expect(ok((await call(CURRENT)).body).currentUser.currentWorkspace.id).toBe(
      B,
    );
    const membershipB = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).findOneByOrFail({ userId, workspaceId: B });
    await getAppProviderByClassName<UserWorkspaceService>(
      'UserWorkspaceService',
    ).deleteUserWorkspace({
      userWorkspaceId: membershipB.id,
      workspaceId: B!,
      softDelete: true,
    });
    expect((await call(CURRENT)).body.errors?.length).toBeGreaterThan(0);
    cookie = undefined;
    const remaining = ok(
      (
        await call(
          'mutation($email:String!,$password:String!){signIn(email:$email,password:$password){availableWorkspaces{availableWorkspacesForSignIn{id loginToken}}}}',
          { email, password },
        )
      ).body,
    ).signIn.availableWorkspaces.availableWorkspacesForSignIn;
    expect(
      remaining.some((workspace: { id: string }) => workspace.id === B),
    ).toBe(false);
    await exchange(
      remaining.find((workspace: { id: string }) => workspace.id === A)
        .loginToken,
    );
    await getCoreRepository<UserEntity>(UserEntity).update(userId, {
      canAccessFullAdminPanel: false,
    });
    expect(
      (
        await call(
          'mutation($input:CreateWorkspaceOnSameOriginInput!){createWorkspaceOnSameOrigin(input:$input){workspace{id}}}',
          {
            input: {
              displayName: 'Demoted server admin',
              expectedWorkspaceId: A,
            },
          },
          A,
        )
      ).body.errors?.length,
    ).toBeGreaterThan(0);
  }, 600_000);
});
