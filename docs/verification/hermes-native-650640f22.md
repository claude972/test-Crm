# Native Hermès acceptance — 650640f22

GitHub Actions [41013453457](https://github.com/claude972/test-Crm/actions/runs/41013453457) completed successfully at source `650640f227ea7093573faae723504f9a56244725`, job123924310371.

The guarded integration wrapper reset and provisioned only the fresh hosted `p0_ci` PostgreSQL/Redis services, then executed both native suites: `hermes-structure-dashboard.integration-spec.ts` and `hermes-prospection.integration-spec.ts`. Each source contains seven active scenarios, with no skip/todo/only; the wrapper reports `Hermes integration: selected suites passed` after the real run. **All 14 scenarios passed.** No assertions or database constraints were weakened.

The dashboard suite exercises actual A/B/C records and roles, boundary dates/soft deletion, aggregation with denied people access, C isolation, forged and unknown IDs, an account without memberships, and immediate membership revocation. Earlier fixture FK/date/duplicate-email failures were corrected before this passing run.

The prospection suite exercises the real HTTP metadata schema and native repositories: A/B isolation, contact qualification, idempotent replay, native DRAFT without delivery, public opposition semantics, durable suppression after reimport and revoked access. This does not verify a configured external SMTP relay or provider delivery.

The same job passed 200 unit tests in 17 suites, backend typecheck/compile, official registered migration checks and startup/client configuration. It did not run the frontend browser flow. Frontend100-test proof is recorded separately; the browser helper correction `8e3b90659` awaits combined run41015984154. No preview recipient URL is certified by this report.
