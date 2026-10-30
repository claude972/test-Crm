# Hermes prospection: native HTTP/ORM integration recipe

Prepared source, not an executed database result. Ownership is the new suite `apps/crm/ui/packages/twenty-server/test/integration/graphql/suites/hermes-prospection.integration-spec.ts`; no production service, shared harness, workflow or original local database is changed.

## Native harness and credentials

The suite uses the repository's integration Jest globalSetup/server, Apple/YCombinator A/B seeds, native UserWorkspaceService/RoleService membership setup, and native AccessTokenService.generateAccessToken. Passwords are freshly random and hashed by the native utility. Tokens remain in test memory and request headers; assertions never print tokens, unsubscribe HTML or full response bodies. No JWT is forged, no signing secret is embedded and no external recipient is used. All fixture addresses are under example.test.

Core repositories are resolved through the existing `getCoreRepository` helper and services through `getAppProviderByClassName`. These helpers account for the Jest globalSetup/test VM class-identity boundary. The global `testDataSource` is the raw SQL datasource and is not used as an entity repository. Native WorkspaceOrmManager with system context is used only for fixture verification/cleanup; every business operation being tested goes through the real authenticated HTTP metadata API.

## Seven scenarios ready for CI

1. HTTP import, canonical email normalization, stable batch/row IDs on replay and conflict for reused external ID with changed source content.
2. Native person/company qualification, repeated qualification without duplicates, and independent same-email/same-external-ID contacts and companies in workspaces A and B.
3. Foreign batch ID rejection; restricted-role list/import/qualification refusal without exposing a batch or changing staging.
4. Native DRAFT/messageList/messageListMember creation and idempotent draft replay, with sentAt/scheduledAt null and zero campaignDelivery records. No send or schedule mutation is called.
5. A signed native unsubscribe token is created in memory. GET preferences creates no opposition; two POST one-click calls create exactly one durable native UNSUBSCRIBE. Reimport/qualification/draft remain blocked in A, while the same email can still be qualified in B.
6. A previously valid token is refused after direct fixture role-target deletion, without invalidating the cached role first; no batch is created.
7. A previously valid token is refused after native membership soft revocation, while existing staging and durable opposition are preserved.

Unique fixture emails/names and generated native record IDs are cleaned; original A/B staging snapshots and original campaign feature-flag values are restored. Fixture users/memberships/workspaceMembers are removed. A fixture restricted-role metadata record may remain until disposable runner teardown. No production seed account or data is deleted.

## Required CI sequence

The official HermesImportState migration must already be reviewed, registered, compiled and applied by native reset/migration before this suite. Root module/metadata resolver wiring must also be present. Run only through the guarded native integration wrapper (`dc8056fb7` or its reviewed successor), which checks the disposable target **before** the native harness resets a database. A suite-level assertion runs too late to replace this wrapper.

From repository root in the disposable CI job:

```sh
P0_INTEGRATION_DISPOSABLE=true node scripts/check-hermes-integration-p0.mjs test/integration/graphql/suites/hermes-prospection.integration-spec.ts
```

Required job services remain PostgreSQL loopback 5432/database p0_ci and Redis loopback 6379, with freshly generated CI credentials and no private .env files. The wrapper supplies EMAIL_DRIVER=logger, EMAILING_DOMAIN_DRIVER=LOG, billing/telemetry disabled and a fresh APP_SECRET; the suite explicitly checks LOG before fixture writes. This allows the native community EmailGroupAccessService to create a DRAFT without bypassing its policy. Campaign feature flags are enabled/restored through native FeatureFlagService. The wrapper also builds/resets/seeds with native commands; do not substitute a production or existing local database.

## Checks actually performed

SWC parsed/transformed the test source without execution; every src/test import path resolves in the checkout; formatting and git whitespace checks pass. No Jest integration command, PostgreSQL connection, HTTP server, queue worker, provider probe or real message send was started locally. Full TypeScript integration validation and the seven HTTP/ORM assertions remain unverified until root runs disposable CI. A pending or failed migration/harness/API check must not be reported as a passed recipe.
