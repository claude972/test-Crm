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

## Actual CUA acceptance on79830, 15:39–15:52UTC

Fresh browser login succeeded through the private share without a Vercel login. Dashboard reads5companies/5people/6opportunities/0tasks. Native Messaging navigation label is now present; WhatsApp and Email tabs correctly show NOT_CONFIGURED, replies/sync disabled and no invented messages. Intake status says no delegated entry point. The manual disclosure opens by a real click and exposes its editable form; no manual batch/qualification/send is claimed for this pass (CUA datetime-local fill left the value empty).

A synthetic manual note was created via native person-record UI and appeared in both the native note list and the new chronology/recorded-actions section. Its title/body remained after full reload. It explicitly states no message was sent and no provider reception was claimed. Form responses are described as CRM notes; calendar queries returned a genuine empty list. No live Forms/Cal event was sent.

At390x844, dashboard and messaging had documentWidth390. Mobile Home menu navigation to the modules worked. Authorised-company summary read the one permitted demo workspace and matching aggregate5/5/6/0; cross-workspace browser switching is not claimed for this account. Remaining polish: company-summary column headers overlap on the narrow display, and parts of the session remain English. PWA/API helper passed health, exact same-origin config, standalone manifest and reachable192icon; physical-phone installation and offline behavior remain untested.

Combined79830 run41080586954 failed at a stale browser step filling hidden Batch name before opening the newly collapsed manual form. Test-only commit333ba534927e177c90b35eb4157d75d8d767dec4 adds the real disclosure click and preserves every assertion. New combined41084109198 is running, not yet claimed green. apps/ trees are identical between79830 and333ba; preview remains the exact79830 frontend/backend pair. Screenshot evidence: /Volumes/Stockage/dev/hermes-crm/artifacts/hermes-final-*-41080668092.png. Credentials/share remain exclusively private, outside Git. No real provider or prospect send was used.
