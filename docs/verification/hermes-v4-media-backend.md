# HERMES-V4-PARCOURS-COMPLET-20261030 — lot B checkpoint

Branch `feat/codex-hermes-v4-media`, base `baece3a46a6286a933cfc99b22a53ac50c34e498`. Status: in_progress, not ready for integration until the generated migration and exact-revision cross-review pass. Original workspace/DB/environment/backups untouched. No account/provider send, production deployment or paid service added.

## Delivered code

- Native upload quarantine/finalize/cancel with bounded format/size, native sniff/SHA256, workspace/conversation/connection/owner checks, one-shot asset binding and private authenticated 60-second FILE reads. Browser audio containers retain the native detected MIME.
- Additive V3 WA operations; v1 text transport/probe sequence preserved. Durable UNCONFIRMED reservation precedes bytes/network; repeated/uncertain requests never re-send; human sends remain authorized under OFF. No inferred MCP media understanding.
- Official Evolution2.3.6 sendMedia/sendWhatsAppAudio/getBase64FromMediaMessage wire paths, exact-version media gate, secure existing SSRF agents and bounded responses. Webhook media URLs/keys never become download locators. Incoming media persists through the native file machinery.
- Shared EMAIL/FILE assets, scoped byte cloning, multi-attachment atomic rich-email send boundary, typed private envelope and CID mapping for C. B does not implement MIME/IMAP/SMTP or claim a real mailbox. Mail history hydrates with server-only automation suppression and OBSERVED status; a Sent entry is not acceptance evidence. Draft conversations contain no fake message. Last activity is monotone for old imports/echoes.
- Dedicated read-only CI workflow compiles exact baseline and feature, creates only disposable GitHub PG/Redis, invokes official2.52 generator and emits a review patch. The script rejects local/original/private-env targets and unrelated schema SQL; intended checks include full baseline/feature metadata convergence through up/down/up, eight-connection asset reservation, scoped lookup and cascade.

## Checks actually performed

Local isolated Jest/SWC runner with shared existing dependencies, `--runInBand --testTimeout=30000`:

- 143 tests / 6 suites PASS: messaging core (legacy modes, races, rich email atomicity, idempotency, history suppression), media service authorization/revocation/quarantine, synthetic Evolution media/text HTTP provider, receiver and webhook HTTP.
- 4 additional tests / 1 suite PASS: actual native magic-byte parser with real PNG and HTML/SVG masquerading as PNG; format allowlist. Total147 tests in7 suites across those two commands.
- A prior default5s test run timed out under local host load in an existing loopback handoff test; the full rerun with30s bound passed. This is recorded instead of concealing the failed attempt.
- Script syntax, YAML read-only permission shape, local/disposable-target rejection, `git diff --check` passed. Gitleaks staged scan passed for the first checkpoint; repeat before the next commit.

GitHub run [41133172403](https://github.com/claude972/test-Crm/actions/runs/41133172403), checkpoint584d7f3e6: shared/SDK/email build, production TypeScript, feature compile, exact baseline compile and regressions passed. PG generation failed before the native migration command because the baseline CLI bootstrap lacked the built SDK metadata asset. The workflow now copies that existing built asset to both isolated server outputs. The updated mail contract/array schema requires its own new CI run; no PG success or typecheck of the updated revision is claimed here.

## Remaining gates / review

1. Run the updated CI, inspect and apply its exact generated migration/manifest patch, rebuild and rerun verification. No handwritten migration or manifest edits.
2. Independent security/concurrency review of the exact pushed revision; Claude WA/Mail contracts and root combined integration.
3. Native authenticated HTTP read/upload/send fixture and A/B/C isolation in the combined runtime; no assertion that mocked unit authorization proves full authentication integration.
4. Root private online preview after integration. No standalone UI/deployment owned by B.
5. Provider runtime/ingress/voice conversion remains unconfigured and not tested live. canReceiveMedia/canRecordVoice remain false pending real capability evidence; canSendMedia requires exact live version+open connection; rich-email readiness belongs to C. No test provider is presented as WhatsApp delivery proof.

Exact API signatures and source links: `docs/handoff/hermes-v4-media-contract.md`. Coordination agent should preserve these limits in root CORRECTIONS.md and keep B in_progress until the gates pass.

## HERMES-V4-MEDIA-001 — transaction manager propagation (root review)

Reviewer root/C; reviewed checkpoint `bef781c86` (runtime media source identical to `e1ca825b9`). Status: `fixed_pending_review`; independent root recheck remains required.

Evidence: `HermesMediaService.bind(manager)` passed the manager to `scoped`, but `scoped` called `conversation` without it. `conversation` used both `access.assertAllowed(actor)` and the default DataSource repository. A deterministic pre-fix regression supplying a reserved manager and denying another DataSource checkout failed with `SECOND_POOL_CONNECTION_REQUIRED_INSIDE_LEDGER_TRANSACTION` before the asset update. This proves an extra checkout in a transaction, not a completed real PostgreSQL pool exhaustion experiment.

Correction: propagate the optional EntityManager through authorization, conversation lookup and asset lookup; reuse the DataSource only outside a caller-owned transaction. Recheck authorization after the awaited asset query and before exposing/binding the asset. Cancellation outside a transaction uses the explicit default path.

Focused checks: the original regression changes from red to green; a gated asset lookup revokes membership before continuation and proves zero writes; eight mocked reserved transaction managers complete without a DataSource checkout. Broader media/messaging/Evolution regressions and the exact final-source production CI are reported to coordination after completion. The generator workflow at `bef781c86` remains a separate metadata/SQL checkpoint, with its eight historical baseline deltas reported in the artifact; this fix changes no entity metadata.

Manager-fix validation (2026-10-30): all three focused manager tests pass. Broad local run:160passed/162tests, with two500ms Evolution text fixture timeouts under concurrent local load; the unchanged failing Evolution suite rechecked alone and passed31/31 in2.38s. No Evolution source/test timeout was changed to obtain that result. Final GitHub production compilation and isolated protocol/migration checks remain required. The first fixture-preparation CI (`41136004030`, `bef781c86`) exposed the remaining semantically equivalent JSONB default comparison after native synchronization; its historical drift artifact remains retained and that failure is not a media migration pass.

Native controller DI checkpoints: `41137043803` first exposed missing AccessTokenService; native TokenModule import fixed it. `41138076701` then exposed the second JwtAuthGuard constructor dependency, WorkspaceCacheStorageService. HermesMessagingModule now imports both native modules, matching FileApiModule rather than duplicating or bypassing auth providers. CustomPermissionGuard and AuthPrincipalGuard have no injected dependencies; the native generator's next full Nest bootstrap is the decisive verification. Historical default proof had already passed before these DI failures; neither failed run proves PostgreSQL media up/down/up.

Correction of the initial canonical-drift interpretation (after `41139918458`): the seven columns are explicitly decorated `WasRemovedInUpgrade` and hidden by the native UpgradeAwareEntityMetadataAdapter at the applied cursor. Bare DataSource comparisons misleadingly proposed reintroducing them; fixture synchronization then made the official CLI propose seven removals plus the seven media statements. They are not seven broken historical migrations. The fixture now performs **no schema synchronization**: baseline and feature comparisons both use the same real native CommandModule context/cursor as the official CLI. The raw canonical eight-query diagnostic is retained separately, and only the independently proved JSONB default representation is normalized in memory. SQL candidates are saved as explicitly unvalidated evidence before the unchanged strict seven-statement guard; no extra statement is ignored or applied. Up/down/up must converge with the native upgrade-aware baseline/feature metadata. Earlier failure reports and artifacts remain historical evidence, not passes.

## Official 2.52 media migration applied from passed artifact

GitHub Actions run41142493024, source5428522daa5fb133ec5d314e86ac52b30319de0b, completed SUCCESS. Exact official native generator patch imported without hand editing: `2-52-instance-command-fast-1793402072719-add-hermes-media.ts` plus its native manifest registration. Exactly7up/7down statements: media table,2indexes,2native cascading FKs, message kind/attachmentIds. Native CommandModule candidate SQL exactly equals generated up SQL.

Proof: same native upgrade-aware cursor baseline and feature, exact semantic JSONB fixture normalization only, full production TypeScript/Nest compile, messaging/media regressions, PostgreSQL16 up→feature convergence→down→baseline convergence→up→feature convergence, foreign workspace lookup zero, eight real PG connections with one asset reservation winner, and native workspace cascade. Two seeded native applications satisfy both deferred workspace FKs. No local/original database was touched. The original raw canonical8-entry diagnostic is retained in the artifact; seven removed-in-upgrade columns were never reintroduced. Final committed-command CI remains required; D must generate only its own delta after this B schema.
