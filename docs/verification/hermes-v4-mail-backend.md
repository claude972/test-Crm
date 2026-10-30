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

## Native editable draft checkpoint

Local stateful native-driver fixture runs actual MailComposer/PostalMime: save empty draft, replay without append, edit To/subject/body, reject stale revision, move only replaced UID to native Trash, add private PDF in the same canonical scope, and pass a distinct send request to the existing ledger. B helper regression covers stable identity, OFF preservation, clearing delegation, and freeze after each PENDING/ACCEPTED/UNCONFIRMED/FAILED status. No real IMAP server or Redis concurrency integration is claimed. Full local C66tests/5suites and B63ledger tests pass; cloud checking this draft source is pending. Empty-draft persistence/replacement now has a fixture slice, but Sent-copy/echo reconciliation and combined integration remain open.

## Sent copy versus SMTP acceptance

Local72mail tests/5suites pass. New stateful native-driver cases lose APPEND ACK after storage and before storage, then instantiate a new mailbox service with retained durable reservation/native data. Both retain SMTP ACCEPTED, make one APPEND only, and use search-only reconciliation after reload. The send ledger stand-in counts one emission for the same immutable request; actual SMTP framing/lost DATA ACK are independently covered by real Nodemailer loopback fixtures, not an external provider. Native metadata-manager tests reserve PENDING once, keep UNCONFIRMED search-only, associate only an already ACCEPTED canonical receipt, and never upgrade an unconfirmed send. Proven copies read through the same canonical message/assets without another ingestion.

Provider-auto-Sent tests add Received/Date and omit Bcc: equivalent sender/envelope/content/PDF is reused without APPEND; a changed PDF with the same Message-ID is refused as equivalent. Public metadata callbacks contain no hidden recipient. C cloud draft41142852573 failed at immutable dependency installation ENOSPC before compilation; C workflow now uses the same strictly hosted-runner fixed SDK cleanup as B. Final Sent/draft production typecheck and combined D integration are pending. No provider configuration, external mailbox session or real recipient delivery is claimed.

## HERMES-V4-MAIL-004 — automatic-responder loop guard

Reviewer root, source reviewed4f864/241413; owner C/B, status `fixed_pending_review`. Primary reference checked: [RFC3834 sections2 and3.1.7](https://www.rfc-editor.org/rfc/rfc3834.html). Before the fix,7of10 focused cases failed: native Auto-Submitted/return-path/bulk/list/report messages allowed AUTO, and true delegated SMTP replies lacked the automatic marker.

Native parsed headers now derive a bounded reason (no raw headers/Bcc in metadata). Non-no Auto-Submitted, duplicate/ambiguous fields, null Return-Path, Precedence bulk/list/junk, List-Id and delivery-status reports suppress automatic bot invocation. Valid `Auto-Submitted:no` parameters preserve normal behavior. B ingest independently refuses AUTO on the reason before MCP, while authorized manual draft/reply remains available. The outbound server-only `automated` provenance is derived exclusively from internal botGrant; public reply rejects a forged field. Both rich and legacy SMTP add auto-replied only for this provenance.

Native SMTP loopback cases verify marked true AUTO and unmarked human rich/legacy sends. B64ledger tests pass, including zero MCP/send for the automatic inbound, normal human inbound AUTO retained, manual MCP draft/human send allowed, and no forged automated input. Full C86mail tests/5suites passed before an additional long-thread regression; final exact-source cloud checking follows. These measures cover the implemented loop guard, not a claim of complete RFC3834 or provider behavior conformance.

Further self-review hardened stable drafts: foreign canonical IDs, stale revisions and invalid private asset scope reject before canonical retargeting; a new send request ID cannot bypass an existing uncertain reservation for the same draft. Verified alias changes keep the native draft identity stable. Thread references preserve the root and latest entries within B's20-reference bound.

Native accepted-draft disposition: three cases verify exact draft→Trash only after ACCEPTED, no MOVE after UNCONFIRMED, and no deletion of a newer edited native draft. Full local suite90tests/5suites passes. Cloud c01 run41144420833 reached production typechecking and found one nullability mismatch in PostalMime attachment filenames; fixed as type-only compatibility. These sources still need the next exact-revision cloud pass. Stable replacement for legacy reply/forward SaveDraft remains explicitly unfinished.
