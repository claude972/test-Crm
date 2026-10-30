# Hermès integration checkpoint — 2026-10-30 03:50 UTC

Root branch: feat/codex-hermes-integration. Original dirty checkout remains untouched. No production service, paid service or external prospect send was used.

## Verified locally

The integrated targeted backend run passed **169 tests across 14 suites**, including live-membership guards, B2B import/qualification/suppression, canonical unsubscribe tokens, Evolution SSRF-safe status probes, campaign quarantine/retry paths and real Nodemailer TCP loopback with lost receipts after DATA. Log is private/local; no provider credentials are printed. These are synthetic fixtures, not a real WhatsApp account or SMTP provider delivery.

Unconfirmed SMTP handoffs carry SEND_OUTCOME_UNCONFIRMED in single and batch results. The native campaign layer persists a quarantine marker before transport and excludes it from subsequent claims/recovery. No SENT or DELIVERED is invented. A crash before actual transport may conservatively need manual reconciliation.

## Cloud build evidence and failure being corrected

Run [40997692482](https://github.com/claude972/test-Crm/actions/runs/40997692482), exact source afe9558d7721fa5d179ad21e4caeb2ff25def882, passed frontend build, backend production typecheck, backend executable compilation, the then-71 Hermes tests and migration guard unit tests. It failed before database access because the migration guard rejected two tracked environment fixtures (.env.test and .env.e2e-testing-server). No generated migration or DB integration success is claimed.

The workflow now removes only those two unchanged Git-tracked fixture files from its fresh GitHub-hosted checkout, with explicit runner/tracked/unchanged guards. It never reads or removes any local/private environment. Other environment files remain forbidden; commands receive the explicit disposable database target. Root integration CI runs are queued rather than cancelled by the next commit, allowing the first official migration artifact to finish.

## Integrated frontend and remaining checks

Claude commits 9f57915fb, 705177d46 and b923f63d1 were integrated individually, avoiding the unrelated historical Char merge. Settings → All my companies is a real metadata-backed read-only view. It does not change the active CRUD workspace. The asynchronous logout purge still needs Claude follow-up and cloud/browser verification. A full Monday-inspired visible redesign and B2B reception screens are in progress, not claimed finished.

Evolution metadata status is wired to a no-argument query with fresh workspace membership/admin checks. Default configuration is empty and yields NOT_CONFIGURED. PROVIDER_REPORTED_OPEN only repeats provider state, never proves WhatsApp delivery. Secrets are operator-only and scoped by workspace; no existing Railway credentials were reused.

Required next: official migration artifact review/commit/rebuild, --verify-existing against a fresh CI database, native A/B/C integration suite, complete source build and browser walkthrough, followed by a fresh short-lived Vercel preview and recipient share-link test near 05:00 local for the 06:00 report. The previous P0 API session has expired.
