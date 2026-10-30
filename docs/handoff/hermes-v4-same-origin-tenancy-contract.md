# V4 same-origin tenancy backend checkpoint

Mission: HERMES-V4-PARCOURS-COMPLET-20261030, lot A. Isolated branch `feat/codex-hermes-v4-tenancy`, based on `baece3a46a6286a933cfc99b22a53ac50c34e498`.

Status: native PostgreSQL/HTTP validation, production TypeScript and Nest compilation passed for checkpoint `82f3b0f149f5703aa2105d00444050e389489e04` in [CI run 41138218320](https://github.com/claude972/test-Crm/actions/runs/41138218320), alongside 135 unit tests. The subsequent malformed-cookie hardening requires the final commit’s CI and security cross-review. This is not proof of a working deployed creation/switch journey. No live configuration, database, original checkout, credentials, or preview runtime was changed.

## Configuration and native API

`IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED` defaults to false. It is effective only while `IS_MULTIWORKSPACE_ENABLED` is false. Native multidomain behavior wins if both are set. Canonical origin uses the existing `FRONTEND_URL`; no additional domain selector, JWT issuer, session table, or key is introduced. `ClientConfig.isSameOriginMultiWorkspaceEnabled` exposes the effective boolean.

Metadata GraphQL:

```graphql
query {
  sameOriginWorkspaceCapabilities {
    enabled
    canCreateWorkspace
  }
}
mutation ($input: CreateWorkspaceOnSameOriginInput!) {
  createWorkspaceOnSameOrigin(input: $input) {
    loginToken {
      token
      expiresAt
    }
    workspace {
      id
      workspaceUrls {
        customUrl
        subdomainUrl
      }
    }
  }
}
mutation ($input: SelectWorkspaceOnSameOriginInput!) {
  selectWorkspaceOnSameOrigin(input: $input) {
    loginToken {
      token
      expiresAt
    }
    workspace {
      id
      workspaceUrls {
        customUrl
        subdomainUrl
      }
    }
  }
}
```

Create input: `displayName: String!` (trimmed 1–100 characters), `expectedWorkspaceId: UUID!`. Select input: `workspaceId: UUID!`, `expectedWorkspaceId: UUID!`. Both mutations require a native standard browser session, exact canonical Origin, current live membership, and matching verified current workspace. API keys, applications, impersonation, playground and agnostic identities cannot call them. Creation requires a live server administrator and preserves the native enterprise quota and creation rules. It does not enable public signup. The actor/session/role/quota are checked again inside the native creation transaction after its advisory lock. Source session is held using the same connection.

Initial password authentication uses native `signIn`, which issues an agnostic cookie before generating bound picker LOGIN tokens. Redeem the selected native LOGIN through `getAuthTokensFromLoginToken` with canonical origin. Selection only mints a token; do not change the displayed tenant until redemption succeeds. Creation follows the native pending-workspace/activation journey.

## SSO, MFA and token freshness

Every native LOGIN in this mode carries an optional signed internal `sameOriginSessionHash`, derived from the opaque native cookie. No raw cookie is exposed through GraphQL. The current live session binding is checked before JTI consumption, after slow MFA work, and at atomic session replacement. A delayed A exchange cannot replace an already committed B session. MFA reprovisioning does not consume the LOGIN or rotate the cookie prematurely.

Native social/SSO callbacks retain provider/state/enterprise validation. Workspace callbacks redirect with the existing opaque one-shot SSO exchange proof in a fragment; they do not set cookies on an IdP POST. `getAuthTokensFromSSOExchangeToken` may now return optional `AuthTokens.workspaceLoginToken: AuthToken`. The frontend must request that field and redeem it through the same native LOGIN/MFA path before navigating. A global SSO exchange stays agnostic and uses the picker.

## Immutable request intent

Capture `X-Expected-Workspace-Id` from the client/form context before dispatch and before any refresh. Workspace user mutations require a matching header in opt-in mode; reads reject a mismatched header if present. The server compares against its cryptographically/session-verified workspace; the header never selects a tenant. Metadata, data and user upload/REST paths are guarded. Native public authentication/bootstrap, provider webhooks, API keys and fixed-scope machine identities keep their native boundaries. Root fragment/alias expansion is recursive and mixed public/private operations are not exempt.

These checks run at the native request hydration boundary. They reject stale requests arriving after a session change, and prevent an old A form from writing into B through a refreshed B cookie. They do not retroactively cancel an A mutation already authorized before a switch and subsequently waiting inside its resolver. Keep frontend request/form context immutable, discard late A results while B is displayed, and optionally block switching while tenant mutations are outstanding. No global ORM cancellation guarantee is claimed.

When a user bearer and native cookie are both presented, both must be valid and agree on user, workspace and membership. A malformed bearer is never replaced with a cookie. A present malformed/empty authorized native cookie also refuses a user Bearer request; insecure cookies planted on an HTTPS deployment remain ignored under native cookie-name precedence. Duplicate cookie names retain native extractor precedence. `SESSION_SUPERSEDED` means discard late results, clear the old tenant cache, and restore a coherent native authentication context. Never automatically retry a mutation after this error.

## Validation and ownership

Targeted checks cover canonical/malicious origins; default-off and multidomain compatibility; existing admin/enterprise quota rules and concurrent creation; source session changes while awaiting locks; LOGIN JTI and cookie binding; normal/MFA/recovery/SSO redemptions; atomic concurrent session replacement; revocation; fixed-scope principals; stale A bearer + cookie B + header A causing zero writes; immutable request intent including fragments and REST.

A dedicated `hermes-v4-tenancy.yml` workflow builds/types production sources, runs targeted and existing auth unit checks with legacy defaults, then runs the native HTTP suite on disposable GitHub-hosted PostgreSQL 16/Redis 7. Its wrapper hardcodes the single tenancy suite and opt-in while leaving subdomains disabled. Existing stable jobs remain unchanged. The native suite creates a synthetic admin in A, creates/activates B through native GraphQL, checks reload and A/B record isolation, refuses C, stale tokens/headers and malicious origins, then revokes B membership and verifies server-admin demotion. Only owned disposable fixtures are cleaned up.

Ownership extension approved by root: native UserSessionService, targeted UserWorkspaceService/UserResolver picker, AuthTokens DTO, middleware/JwtAuthGuard expected-context boundary, AccessTokenService dual-credential coherence, and isolated CI wrapper/workflow. The additional native CookieService/extractor presence helper is also approved ownership and stays internal (no raw credential API). These authentication boundary changes need a separate security cross-review. No Hermes messaging/mail or frontend files are included. No entity shape changed and no database migration is needed.
