# Hermes connector metadata API

Base: root integration `a112e8347`. Dependencies integrated for verification only: Evolution adapter `07c72f817`, `89b4d5be9`, `1df136be0`; private config variable `2417ba121`. This commit owns only the module/service/resolver/DTO/tests in this parent directory. The `evolution/` adapter remains owned by preview_hosting. CoreEngineModule, metadata resolver registry, configuration definitions and frontend are integrated by root.

## Query contract

```graphql
query CurrentEvolutionConnection {
  hermesEvolutionConnection {
    workspaceId
    provider
    status
    providerState
    checkedAt
    errorCode
  }
}
```

The field accepts **no arguments**. Its output type is `HermesEvolutionConnectionProbe`; workspaceId is UUID, provider is `EVOLUTION`, checkedAt is DateTime. `HermesEvolutionProbeStatus` has exactly NOT_CONFIGURED, PROVIDER_REPORTED_OPEN, CONNECTING, DISCONNECTED, UNAVAILABLE. providerState is nullable String (`open`, `close`, `connecting`). `HermesEvolutionProbeErrorCode` is nullable and has exactly AUTHENTICATION_FAILED, INSTANCE_NOT_FOUND, TIMEOUT, INVALID_RESPONSE, PROVIDER_ERROR, REQUEST_FAILED. PROVIDER_REPORTED_OPEN represents provider-reported state; it does not assert a WhatsApp session or successful message delivery.

Only a standard user session bound to the current workspace can call this metadata resolver. API keys, apps/OAuth, impersonation, playground and workspace-agnostic tokens are refused. Every request rechecks the live DB membership ID/user ID/workspace ID, non-deleted membership/user/workspace, enabled user and ACTIVE workspace. The current role is fetched from the same workspace and must still be an unrestricted workspace administrator (all-settings/read-all/update-all and no field/row restrictions). Missing/revoked membership, revoked/foreign/restricted role or DB failure stops execution before configuration lookup, adapter construction or any provider probe. This conservative first slice does not expose provider status to ordinary workspace members.

The service obtains `HERMES_EVOLUTION_CONNECTIONS` through the injected native KovaaLabCRMConfigService after authorization. No direct process.env access, global/default workspace key, configuration mutation, caller URL/instance/secret or internal-network override is used. The adapter's safe defaults remain in force. Invalid operator configuration or an unexpected adapter exception returns UNAVAILABLE/REQUEST_FAILED without the original exception, JSON, endpoint or API key. Missing workspace configuration remains the adapter's truthful NOT_CONFIGURED state.

## Root integration

Import `HermesConnectorsModule` into CoreEngineModule and register `HermesConnectorsResolver` in the metadata resolver factory used by this repository. The shared root configuration commit provides the private server-only env variable with default `{}`. No database migration or new storage is introduced by this module. Add `src/engine/core-modules/hermes-connectors/**/*.spec.ts` to the root targeted CI Jest selection. No authenticated endpoint is claimed active until this wiring is compiled and deployed.

## Verification

57 tests pass: the adapter's 38 tests plus 19 service/resolver tests. A real code-first GraphQL schema is built in the resolver tests: the field has zero arguments and rejects external workspaceId/baseUrl/apiKey/instanceName arguments. Native principal guard tests prevent unauthorized dispatch; service tests cover fresh role revocation, denied membership, role restrictions, A-only probing, failure before configuration access and generic error sanitization. Tests use mocked DB/provider dependencies or the adapter's isolated synthetic fixtures; no original environment/database, real Evolution instance, telephone or message send is accessed. Full production TypeScript/build and actual authenticated preview checks remain root CI integration work.
