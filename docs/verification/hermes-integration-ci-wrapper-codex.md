# Guarded native Hermes integration CI wrapper

The wrapper is `scripts/check-hermes-integration-p0.mjs`; root owns all workflow wiring. It must run only with NEW disposable PostgreSQL16/Redis7 CI services, after dependencies/shared outputs/backend build (including official generated migrations). It destructively resets `p0_ci` on EVERY invocation. Never point it at the live preview session or any retained data.

Exact command from repository root:

```sh
P0_INTEGRATION_DISPOSABLE=true node scripts/check-hermes-integration-p0.mjs
```

Required preconfigured CI environment (do not place credentials in command arguments or logs): `GITHUB_ACTIONS=true`, numeric `GITHUB_RUN_ID`, `PG_DATABASE_URL` with fresh CI password and exact `postgres[ql]://…@127.0.0.1:5432/p0_ci`, `REDIS_URL=redis://127.0.0.1:6379`. No query/fragment overrides. The wrapper refuses non-CI execution, missing disposable acknowledgement, another database/host/port, inherited reset-status file and any `.env`, `.env.test`, `.env.local`, `.env.test.local` in repo/UI/server locations, including broken symlinks.

It generates and masks an ephemeral APP_SECRET, disables DB config overrides, mail sending (both logger drivers), billing/FDW/telemetry and multi-workspace host routing. Built native commands run in test mode: truncate-db; setup-db; run-instance-commands --force --include-slow; cache:flush; workspace:seed:dev. Then it runs the existing Jest integration config and native harness, `--runInBand --runTestsByPath`, dashboard suite by default. Commands and test subprocesses have bounded stage timeouts and process-group cleanup; no credentials are passed in argv. Buffered failure output is bounded and redacts database/Redis URLs/passwords, APP_SECRET and JWTs. Successful child output is omitted.

Future prospection suites can be supplied explicitly, without another wrapper or shell interpolation:

```sh
P0_INTEGRATION_DISPOSABLE=true node scripts/check-hermes-integration-p0.mjs test/integration/graphql/suites/hermes-structure-dashboard.integration-spec.ts test/integration/graphql/suites/hermes-prospection.integration-spec.ts
```

The second file is an example of the future interface, not a claim it exists. Only existing `hermes-[a-z0-9-]+.integration-spec.ts` files in that exact suites directory are allowed; realpath must match (no traversal/symlink). All input, env and built-file validation finishes before the first reset subprocess.

Important ordering: native Nx `test:integration:with-db-reset` performs reset BEFORE assertions in the testfile. Current Jest globalSetup itself waits for an optional reset status and creates the app; it does not reset. Do not bypass wrapper guards by invoking Nx reset first. This wrapper uses already-built native commands directly to avoid an unguarded parallel reset or rebuild; its guarded reset/seed precedes Jest globalSetup.

Validation performed: `node --check` for wrapper/test, 9 Node guard tests passed without any DB/network/service, Prettier and diff checks. Dashboard suite source parsed with SWC without executing it. No actual ORM, migration/seed, integration test, process cancellation or CI run was executed locally. Parent's combined fresh-service CI is authoritative; setup service signature/source audit is documented separately in `hermes-dashboard-harness-correction-codex.md`.
