# Hermes V4 mail — checkpoint verification

Branch `feat/codex-hermes-v4-mail`; base `baece3a46a6286a933cfc99b22a53ac50c34e498`. Native IMAP/SMTP/PostalMime/MailComposer/sanitize-html, ConnectedAccount encryption, private B assets and durable B send ledger are reused. No provider is configured or contacted externally by these checks. No C entity/migration or second credential/draft engine.

`b912f180c` passed the dedicated cloud workflow `41137686851`: full production TypeScript checking, Nest compilation and54mail tests, including two real Nodemailer→isolated loopback SMTP protocol fixtures. That checkpoint still had the finding below; a green build did not prove safe in-flight observation writes.

## HERMES-V4-MAIL-001 — trusted snapshot/deadline before writes

Reviewer root/A, reviewed `b912f180c`; owner C, status `fixed_pending_review`. Root must recheck the pushed fix and combined D/B runtime; no independent review or PostgreSQL transaction proof is claimed here.

Reproduction: block `media.receive`, revoke the central MAIL record or expire the caller's deadline, then release the promise. Both pre-fix tests incorrectly resolved and called inbox.ingest. The focused red run had2failures in3.1s. Both cases now reject before ingestion. A third case calls the trusted guard with a reserved manager and refuses a second global account lookup, proving central reader/native account/membership authorization use the supplied manager.

Correction: capture connectionId, central revision, account identity/revision and a synchronous deadline assertion. Pass the assertion into native media receipt and inbox ingestion as server-only `assertLive(manager?)`. Recheck after awaited media work, after advisory locking, before native/ledger writes and before transaction commit. Polling carries its real45second deadline; mailbox selection/read/reply/draft preparation carry the session deadline. B callback guards have separate red→green tests for post-lock revocation, rollback after awaited insert, stale allocation and revocation while native bytes were awaited. D's manager-aware reader serializes the central record with the same workspace messaging lock; this requires the final D checkpoint during integration.

Local final check for this fix:58tests/5mail suites pass, including native SMTP framing/Bcc privacy and lost-DATA-ack UNCONFIRMED handling. Prettier and git diff whitespace checks pass. The upcoming cloud run must verify this exact fix revision; prior cloud results stay attached to b912.

Folder actions now validate destinations before changing flags and operate on UID summaries without requiring a MIME body. An additional case moves a100MiB message without downloading it; UID validity, current LIST, current actor/binding and deadline checks remain required.

## Open acceptance work

HERMES-V4-MAIL-002 (root/P2) concerns RFC+text dedup ignoring attachment differences; a full native MIME digest/provenance fix and tests are next. Native empty draft editing/replacement/replay, stable draftId versus immutable send clientRequestId, Sent copy/echo reconciliation and MOVE→Archive→INBOX polling acceptance remain open. Current code and these test results are not a declaration that the whole mailbox, live provider, full CRM, online preview or PWA acceptance is complete.
