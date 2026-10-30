# Official Hermes migration generation in disposable CI

The new script `scripts/check-hermes-migration-ci.mjs` operates only in a GitHub-hosted Actions checkout, with exact PostgreSQL URL `postgres://postgres:<GITHUB_RUN_ID>@127.0.0.1:5432/p0_ci`, exact loopback Redis, no local/private `.env*`, and an initially empty core schema. It does not access original local database configuration, launch an application server/worker, send mail, or publish changes. Child commands receive an explicit environment allowlist with a fresh app secret, disabled telemetry/billing, and logger email.

## Prerequisites and workflow insertion

Reuse the existing backend workflow build prerequisites: immutable workspace dependencies, built shared/client SDK/email packages, production backend typecheck and Nest compile. Use the existing disposable postgres:16 and redis:7 services from the runtime checkpoint. Run **before** `check-backend-runtime-p0.mjs`, which initializes the same database. No workflow owned by the root agent is changed in this commit.

Insert after the backend compile step (repository-root working directory):

```yaml
- name: Verify Hermes policy and security unit tests
  working-directory: .
  run: |
    node --test scripts/check-hermes-migration-ci.test.mjs
    node apps/crm/ui/node_modules/jest/bin/jest.js --config apps/crm/ui/packages/twenty-server/jest-hermes-prospection.config.mjs --runInBand
- name: Generate official Hermes migration and verify disposable imports
  if: ${{ inputs.runtime-smoke && steps.backend_types.outcome == 'success' && steps.backend_build.outcome == 'success' }}
  working-directory: .
  env:
    PG_DATABASE_URL: postgres://postgres:${{ github.run_id }}@127.0.0.1:5432/p0_ci
    REDIS_URL: redis://127.0.0.1:6379
  run: node scripts/check-hermes-migration-ci.mjs --generate --reset-after-generation
- name: Publish generated Hermes migration for review
  if: ${{ always() && inputs.runtime-smoke }}
  uses: actions/upload-artifact@v4
  with:
    name: hermes-migration-${{ github.sha }}
    path: hermes-migration-artifacts
    if-no-files-found: error
    retention-days: 7
```

**The shown generation command resets the disposable database after successful validation.** It first verifies that all fixture workspaces were removed, closes its connections, connects to the same loopback service’s `postgres` administrative catalog using the same run-ID credential, verifies ownership of the fixed `p0_ci` database, and drops/recreates only `p0_ci`. This allows the following native runtime smoke to initialize a genuinely empty database. The generated migration is not in the already compiled manifest; that following baseline smoke does not prove Hermes activation. After artifact application/rebuild, `--verify-existing` provides that execution proof on another fresh database. Omit `--reset-after-generation` when using a dedicated generation-only job; it then leaves the validated disposable schema in place.

The script runs the established `dist/database/scripts/setup-db.js` and `run-instance-commands --force --include-slow`, then the official command:

```sh
node dist/command/command.js generate:instance-command --name add-hermes-import-state --type fast --version 2.52.0
```

It never hand-edits the migration manifest. It checks current version, monotonic timestamp, automatic registration and strictly Hermes-only CREATE TABLE / cascading workspace FK / reverse SQL. Unexpected baseline schema drift is reported and rejected, rather than shipped as a broad migration.

The existing `p0-combined.yml` calls the backend reusable workflow with `runtime-smoke: true`. After the root agent adds the steps and pushes the reviewed branch, dispatch it with:

```sh
gh workflow run p0-combined.yml --ref <reviewed-integration-branch>
gh run list --workflow p0-combined.yml --branch <reviewed-integration-branch> --limit 1
gh run watch <run-id> --exit-status
gh run download <run-id> --name hermes-migration-<exact-commit-sha> --dir /tmp/hermes-migration-review
```

Review `report.json`, `generated-sql.json`, the timestamped migration source, the automatically updated full manifest, and `migration.patch`. The patch contains only the new generated file and the manifest registration. In the isolated integration checkout:

```sh
git apply --check /tmp/hermes-migration-review/migration.patch
git apply /tmp/hermes-migration-review/migration.patch
```

Review/commit these generated changes, rebuild backend, and change the CI command to `node scripts/check-hermes-migration-ci.mjs --verify-existing`. That mode initializes another fresh disposable database using the **official registered executor**, checks the existing generated file and performs the same database integration checks. Generation mode is intentionally refused once the generated migration is already in source.

## What is verified

The generated migration is loaded in an isolated compiler/VM harness solely to capture its up/down query lists. After a strict SQL scope check, those statements run on disposable PostgreSQL. Tests then use the **unchanged production HermesImportStateEntity and HermesImportStateService source** with a real TypeORM repository, synchronization disabled. Minimal workspace relation metadata and a fixture access callback avoid loading/provisioning an entire customer workspace.

Database checks cover JSONB default shape, eight simultaneous identical import claims (one new batch and stable IDs), eight simultaneous independent imports (no lost writes), separate workspace namespaces, persistence after service reconstruction, rollback above the 2 MB bound, denied fixture access, workspace-delete cascade isolation, reversible down/up, and orphan-workspace FK rejection. Synthetic data uses example.test addresses. The fixture access callback is not a substitute for the separate live-membership/role unit suite.

This validates durable staging integration, not the complete authenticated GraphQL journey or a provisioned native contact/campaign workspace. Native qualification and suppression behavior remain covered by the dedicated unit suite; full authenticated API and SMTP allowlist checks remain separate root integration checks.

## Local verification status

Local validation completed: Node syntax check passed; 18 CI target/SQL guard tests passed; the portable Jest configuration ran all 26 Hermes policy/access/bridge tests successfully. No database was accessed. Node syntax and the CI target/SQL guard unit suite are runnable without a database. The database-generation path deliberately refuses local execution and must be run by the root agent in the disposable CI job; no database integration pass is claimed before that run.
