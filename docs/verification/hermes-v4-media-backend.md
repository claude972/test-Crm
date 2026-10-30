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
