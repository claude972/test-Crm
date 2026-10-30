# Hermes V4 mail — checkpoint verification

Branch `feat/codex-hermes-v4-mail`; base `baece3a46a6286a933cfc99b22a53ac50c34e498`. Native IMAP/SMTP/PostalMime/MailComposer/sanitize-html, ConnectedAccount encryption, private B assets and durable B send ledger are reused. No provider is configured or contacted externally by these checks. No C entity/migration or second credential/draft engine.

`b912f180c` passed the dedicated cloud workflow `41137686851`: full production TypeScript checking, Nest compilation and 54 mail tests, including two real Nodemailer→isolated loopback SMTP protocol fixtures. That checkpoint still had the finding below; a green build did not prove safe in-flight observation writes.

## HERMES-V4-MAIL-001 — trusted snapshot/deadline before writes

Reviewer root/A, reviewed `b912f180c`; owner C, status `fixed_pending_review`. Root must recheck the pushed fix and combined D/B runtime; no independent review or PostgreSQL transaction proof is claimed here.

Reproduction: block `media.receive`, revoke the central MAIL record or expire the caller's deadline, then release the promise. Both pre-fix tests incorrectly resolved and called inbox.ingest. The focused red run had2failures in3.1s. Both cases now reject before ingestion. A third case calls the trusted guard with a reserved manager and refuses a second global account lookup, proving central reader/native account/membership authorization use the supplied manager.

Correction: capture connectionId, central revision, account identity/revision and a synchronous deadline assertion. Pass the assertion into native media receipt and inbox ingestion as server-only `assertLive(manager?)`. Recheck after awaited media work, after advisory locking, before native/ledger writes and before transaction commit. Polling carries its real45second deadline; mailbox selection/read/reply/draft preparation carry the session deadline. B callback guards have separate red→green tests for post-lock revocation, rollback after awaited insert, stale allocation and revocation while native bytes were awaited. D's manager-aware reader serializes the central record with the same workspace messaging lock; this requires the final D checkpoint during integration.

Local final check for this fix:58tests/5mail suites pass, including native SMTP framing/Bcc privacy and lost-DATA-ack UNCONFIRMED handling. Prettier and git diff whitespace checks pass. Cloud run41139339784 at8074a3300 passed full production typecheck/Nest and58mail tests; independent combined-runtime review remains pending.

Folder actions now validate destinations before changing flags and operate on UID summaries without requiring a MIME body. An additional case moves a100MiB message without downloading it; UID validity, current LIST, current actor/binding and deadline checks remain required.

## Open acceptance work

## HERMES-V4-MAIL-002 — complete native MIME proof

Reviewer root, reviewed b912; owner C, status `fixed_pending_review`. The original RFC id/text/participants comparison lost a second physical delivery with different PDF bytes. The regression failed on the old source, then passed with complete native MIME SHA256 stored only in strict server-side providerMetadata (B c814140e9). Exact physical UID identity remains authoritative; RFC reuse without byte proof imports as OBSERVED and cannot trigger automation. Historical records lacking the digest are not guessed to be duplicates.

Tests retain both PDF deliveries, replay an exact byte copy after two native MOVE operations INBOX→Archive→INBOX with new UIDs, and import an unproven legacy copy as observed. This proves exact complete-MIME preservation; server reformatting without a trusted UID mapping is not claimed as recognized equivalence. First synchronization imports observed history, and authenticated IMAP INTERNALDATE survives observation even with a forged future Date header. Full local mail suite:61tests/5suites, including loopback SMTP. No real provider delivery or IMAP server compatibility is claimed. Cloud checking of this revision is pending.

Native empty draft editing/replacement/replay, stable draftId versus immutable send clientRequestId, Sent copy/echo reconciliation remain open. Current code and these test results are not a declaration that the whole mailbox, live provider, full CRM, online preview or PWA acceptance is complete.

## HERMES-V4-MAIL-003 — private-recipient Sent rendering

Reviewer root/A, reviewed b912; owner C, status `fixed_pending_review`. Two focused tests failed on the old source: Sent From-own/To-own/Bcc-external observation threw, and an explicit Bcc-only NEW envelope was refused. Sent without a public external To/CC now uses the own mailbox handle as its canonical public contact. It returns `botUnavailableReason: MAIL_PRIVATE_OR_SELF_RECIPIENT`; no private Bcc appears in public conversation/ingest metadata. Bcc remains readable only by the native account owner.

Explicit NEW/FORWARD composition supports any nonempty combination of To/CC/Bcc, keeps explicit self recipients, and never inherits received Bcc. Bcc-only draft conversation creation uses the own From handle, never Bcc. The existing B strict envelope schema already accepts combined recipients, so no B source change was necessary. Real Nodemailer to loopback SMTP accepted the one hidden RCPT with no hidden address in MIME headers. Full local suite:65tests/5suites pass. This is loopback protocol evidence, not provider delivery. Empty editable drafts/Sent-copy reconciliation remain open.
