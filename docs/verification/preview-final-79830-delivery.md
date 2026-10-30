# Final navigation-fix preview — 30 October 2026

This session supersedes the cancelled47619 preview. Code source `79830bbba9d6d9ce2a1ec1b71a87e19d85ec8813` is identical for backend preview run `41080668092` and frontend bundle run `41080586954`. The one-file frontend fix restores the accessible messaging navigation label/icon; actual visual verification remains root-owned.

- Frontend source and bundle jobs: success. Artifact `12989094188`, downloaded ZIP SHA256 independently verified against GitHub `sha256:c5d52e42826676c9bda13213fe17de90470783947d5e4826ca355aec1f91fb85`.
- Bundle: 2107 files; file-manifest SHA256 `b614bd894047918fba1eb8976ab421fcd348ad5b5f0ecbd8e6ce3ca2fb6fd9cf`; original index SHA256 `a56802dd55f2a6a6d6d3d79a40a1701a453b56a92df7f8d0e65a9920996646fd`. Fresh staging, existing runtime slot only; generated `.env.local` removed without reading before upload.
- Deployment `dpl_CPTA14GHWVVaWGfiuxueNaEZUa5N`: READY, exact isolated project `prj_0YAVdnCjN7e2zHNAbLzUCw3N4JvF`, target null (preview), aliases empty, global protection retained.
- Public protected origin: https://hermes-crm-p0-preview-ip9q4dyij-brafas-projects.vercel.app. Credentials and deployment-scoped share URL are private0600 files outside Git, in a0700 vault. No old account or cookiejar reused.
- Strict same-origin control ContentsPUT commit `39419a4d3b7d51ee73261b234089ca1011ddfa74`, before gate deadline15:45:58.105UTC.
- Gate15:30:58.105UTC; absolute API expiry **2026-10-30T17:00:58.105Z** (13:00:58.105Martinique); private share expiry at least30seconds earlier.

HTTP checks passed: direct tunnel403 without secret; bare deployment302protected; new anonymous share→`/dashboard`200, health200/statusok, client-config200/serverUrl exact. Proof uses ordinary curl and a new cookiejar, no CLIAuth or Authorization header. Onboarding14 steps passed, including fresh signup/workspace/profile/login/completion and verified companyCRUD cleanup. No actual provider connection/send or campaign scheduling.

Deployed webhook rewrite and fail-closed auth verified at `2026-10-30T15:38:06.508159+00:00` using only the share cookie: POSTJSON{} `/webhooks/hermes/intake/<random-synthetic-UUID>`→401JSONNest `HERMES_INTAKE_AUTHENTICATION_FAILED`; POSTJSON{} `/webhooks/hermes/evolution`→401JSONNest `Evolution webhook rejected`. No provider token, application JWT, valid event, external provider or send; neither route returned SPA HTML.

Backend code tree is exactly `ce8d27cd9fb84b1aaac7b5fd5d1c840d06e8f860` on both47619 and79830. Independent native/migration CI41078123431 passed at47619; this is a proof of identical backend code, not a claim that that run used79830. The79830 preview itself passed TS and backend compilation before the gate.

Evidence: `/private/tmp/hermes-final-79830/` contains session.json, front.metadata.json, front.files.sha256, onboarding.json, share-proof.json and edge-auth-proof.json. Root visual login/navigation/dashboard/reception/mobile verification and full combined conclusion remain separate. Disposable API expires while static frontend can persist; Quick Tunnel has no uptime guarantee/SSE support; unconfigured providers remain explicitly unconfigured.
