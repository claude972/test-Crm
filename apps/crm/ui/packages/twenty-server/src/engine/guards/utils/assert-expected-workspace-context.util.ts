import { type Request } from 'express';
import { getOperationAST, Kind, parse, type SelectionNode } from 'graphql';
import { ApiPath } from 'kovaa-lab-shared/types';
import { validate as isUuid } from 'uuid';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { classifyAuthPrincipal } from 'src/engine/guards/utils/classify-auth-principal.util';

export const EXPECTED_WORKSPACE_HEADER = 'x-expected-workspace-id';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// These fields authenticate a new session, not a workspace write. Their native token/CSRF guards still apply.
const PUBLIC_AUTH_FIELDS = new Set([
  'checkUserExists',
  'getAuthorizationUrlForSSO',
  'checkWorkspaceInviteHashIsValid',
  'findWorkspaceFromInviteHash',
  'getLoginTokenFromCredentials',
  'signIn',
  'verifyEmailAndGetLoginToken',
  'verifyEmailAndGetWorkspaceAgnosticToken',
  'getAuthTokensFromOTP',
  'getAuthTokensFromTwoFactorAuthenticationRecoveryCode',
  'signUp',
  'signUpInWorkspace',
  'getAuthTokensFromLoginToken',
  'getAuthTokensFromSSOExchangeToken',
  'renewToken',
  'signOut',
  'emailPasswordResetLink',
  'updatePasswordViaResetToken',
  'validatePasswordResetToken',
]);
const graphqlIntent = (
  request: Request,
): { mutation: boolean; publicAuthentication: boolean } => {
  try {
    const body = request.body;
    const query =
      typeof body?.query === 'string' ? body.query : request.query?.query;
    const operationName =
      typeof body?.operationName === 'string'
        ? body.operationName
        : typeof request.query?.operationName === 'string'
          ? request.query.operationName
          : undefined;
    if (typeof query !== 'string')
      return { mutation: true, publicAuthentication: false };
    const document = parse(query, { noLocation: true });
    const operation = getOperationAST(document, operationName);
    const fields: string[] = [];
    const fragments = new Map(
      document.definitions
        .filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
        .map((definition) => [definition.name.value, definition]),
    );
    const visiting = new Set<string>();
    const collect = (selections: readonly SelectionNode[]): void => {
      for (const selection of selections) {
        if (selection.kind === Kind.FIELD) fields.push(selection.name.value);
        else if (selection.kind === Kind.INLINE_FRAGMENT)
          collect(selection.selectionSet.selections);
        else {
          const name = selection.name.value;
          const fragment = fragments.get(name);
          if (!fragment || visiting.has(name))
            throw new Error('Invalid root fragment');
          visiting.add(name);
          collect(fragment.selectionSet.selections);
          visiting.delete(name);
        }
      }
    };
    if (operation) collect(operation.selectionSet.selections);
    return {
      mutation:
        operation?.operation !== 'query' &&
        operation?.operation !== 'subscription',
      publicAuthentication:
        request.path === `/${ApiPath.Metadata}` &&
        fields.length > 0 &&
        fields.every((field) => PUBLIC_AUTH_FIELDS.has(field)),
    };
  } catch {
    return { mutation: true, publicAuthentication: false };
  }
};

export const isPublicAuthenticationGraphqlRequest = (
  request: Request,
): boolean => graphqlIntent(request).publicAuthentication;

export const assertExpectedWorkspaceContext = (
  request: Request,
  config: Pick<KovaaLabCRMConfigService, 'get'>,
  transport: 'graphql' | 'http',
): void => {
  if (
    !config.get('IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED') ||
    config.get('IS_MULTIWORKSPACE_ENABLED')
  )
    return;
  const principal = classifyAuthPrincipal(request);
  if (principal?.kind !== 'userSession' || !request.workspace) return;
  const intent =
    transport === 'graphql'
      ? graphqlIntent(request)
      : {
          mutation: !SAFE_METHODS.has(request.method),
          publicAuthentication: false,
        };
  if (intent.publicAuthentication) return;
  const expected = request.headers[EXPECTED_WORKSPACE_HEADER];
  if (expected === undefined) {
    if (intent.mutation)
      throw new AuthException(
        'Expected workspace context is required',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    return;
  }
  if (
    typeof expected !== 'string' ||
    !isUuid(expected) ||
    expected.toLowerCase() !== request.workspace.id.toLowerCase()
  )
    throw new AuthException(
      'Workspace context changed',
      AuthExceptionCode.SESSION_SUPERSEDED,
    );
};
