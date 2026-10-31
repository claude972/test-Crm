# kovaalabcrm staging image

This packages the repository's custom CRM, not an upstream Twenty image. It creates no provider accounts, users or tenants. The path retains its historical name; all new deployment resources use project `kovaalabcrm-staging`.

## Build and cloud verification contract

Run at repository root on an isolated Linux/amd64 GitHub-hosted runner. Do not build on the owner's space-constrained Mac or start this harness on the VPS.

```sh
docker build --platform linux/amd64 --target runtime \
  --build-arg HERMES_SOURCE_SHA="$GITHUB_SHA" \
  -f infra/hermes-staging/Dockerfile \
  -t "kovaalabcrm-staging:$GITHUB_SHA" .
HERMES_STAGING_IMAGE="kovaalabcrm-staging:$GITHUB_SHA" \
HERMES_SOURCE_SHA="$GITHUB_SHA" \
HERMES_STAGING_REPORT_FILE="$RUNNER_TEMP/kovaalabcrm-image-report.json" \
  node scripts/check-hermes-staging-image.mjs
```

Build context is root; `Dockerfile.dockerignore` excludes environment files, local databases, dependencies, backups and unrelated applications. Builder and runtime share the pinned Debian/glibc Node24 base. The build performs immutable Yarn installation, native dependency/library builds, catalog compilation, strict frontend/backend TypeScript checks, Nest build, complete frontend and SDK asset copying, then production dependency focus. APP_VERSION is the native migration version 2.52.0, checked against source; OCI revision and `dist/front/KOVAALABCRM_SOURCE.txt` identify the exact Git SHA separately.

The cloud-only smoke uses synthetic secrets, random isolated container/network/volume names and loopback HTTP. It checks image provenance, runtime UID, server/frontend/SDK files, fresh PG16 migration, native cron and final upgrade status, real health/client-config/frontend responses, BullMQ worker registration, PostgreSQL/Redis/local-storage persistence and a repeated same-version migration. This proves neither an older-version upgrade nor a user/provider journey. It submits no campaign or provider operation. Normal completion/failure removes its own resources and 0600 secret files in `finally`; a hard-killed disposable runner is destroyed by GitHub. Reports contain only SHA/image ID and boolean checks. No image publication is performed by these files.

Lightweight boundary tests, without Docker or dependencies:

```sh
node --test infra/hermes-staging/packaging.test.mjs
```

## Persistent staging configuration

The Compose file is a deployment template, not authorization to touch existing VPS services. Before use, the owner/root coordinator must approve the domain, DNS, ingress route, free loopback port, verified image archive/digest, private configuration paths and backup destination. No Caddy configuration, host network, shared external network or existing service is changed here. Proposed URL examples remain placeholders until domain and TLS are verified.

Prepare outside Git, with parent directory mode 0700 and files mode 0600:

- `runtime.env.example` → persistent application secrets and exact HTTPS SERVER_URL=FRONTEND_URL. Set PG_DATABASE_URL to dedicated `db:5432/kovaalabcrm_staging`, user `kovaalabcrm`; Redis URL uses dedicated `redis:6379/0`. Use independent random ≥32-byte passwords, 32-byte hex APP_SECRET and ENCRYPTION_KEY. Keep the keys stable across restart and restore.
- `postgres.env.example` → matching POSTGRES_PASSWORD. PostgreSQL initialization variables do not rotate an existing database's password.
- `redis.env.example` → matching REDIS_PASSWORD.

Required operator interpolation variables: KOVAALABCRM_STAGING_IMAGE (verified local image), KOVAALABCRM_STAGING_RUNTIME_ENV_FILE, KOVAALABCRM_STAGING_PG_ENV_FILE, KOVAALABCRM_STAGING_REDIS_ENV_FILE and KOVAALABCRM_STAGING_BIND_PORT. Never put these values in an artifact, Git file, resolved `compose config` output, terminal recording or public report. Compose must support `env_file.format: raw` (the inspected VPS Compose 5.6 supports it).

The server publishes only `127.0.0.1:<chosen-port>`. PG/Redis have no host ports and use a project-private internal network. The server/worker have a separate project egress network for future explicitly configured providers. Ingress/TLS is a separate reviewed operation; do not weaken TLS, SSRF protection, authentication or another application's proxy settings to make staging work. Local storage, PG16 data and Redis AOF are dedicated named volumes. Server and worker use the same image, keys, Redis prefixes and writable storage. Max configured steady-state memory is 6 GiB (server 2 + worker 1.5 + PG 2 + Redis 0.5), plus Docker overhead; stopped maintenance migration permits another 2 GiB. No new paid service is required.

Only the one-shot `migrate` service migrates. Server/worker depend on its success. An empty database runs setup, registered native instance commands, cache flush, native upgrade, cache flush, verified final upgrade status and verified cron registration. A completed-install marker is written only after all checks succeed. Any existing tables without that marker are refused as unknown/interrupted bootstrap: preserve them and investigate recovery; never reset or silently adopt them. Marker-bearing existing installations run native upgrade without `--force`, then the same strict gates. The native status and cron commands swallow some errors, so exit 0 alone is not accepted. Interrupted commands or unreadable/failed/behind summaries stop startup.

## Maintenance, backup and rollback

Before an approved upgrade, stop this project's server and worker writers, keep PG/Redis available and make a consistent private backup: `pg_dump` of this dedicated database, storage volume, and the persistent keys/configuration. Include Redis AOF if accepted queued jobs must survive. Verify backup integrity and restore into a separate isolated environment before treating it as recoverable. Never invoke the disposable CI reset scripts against persistent staging.

Load only the verified private image archive, verify its SHA256 and OCI source revision, set the image reference, run the dedicated migration service, then start server/worker after its success. Keep the previous image archive and backup. If migration fails, leave writers stopped; do not turn off the gate. Rolling back an image does not roll back migrated data: use the migration-specific recovery plan or restore the matching PG/storage/keys (and queued-work state) backup. Never use `down -v`, prune, reset or cleanup commands on persistent staging.

Operational checks still required after actual deployment: HTTPS chain, intended proxy-only ingress, no exposed DB/Redis, real account onboarding, all acceptance journeys on the exact deployed source, private media, Safari desktop/iPhone access, PWA install/offline behavior and backup restore. A passing image smoke is not proof of any of these. Unconfigured SMTP/WA/MCP/Forms/Cal remain unconfigured. Logger mail is not delivery; no synthetic GreenMail settings are carried into a real-provider claim. This staging has no 90-minute application timeout, but uptime/operations depend on the approved VPS deployment; nothing has been deployed by this packaging task.
