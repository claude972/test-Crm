# Mailbox fixture RFC822.SIZE diagnosis — 2026-10-31

## Scope and finding

Candidate application `508d36d60c024eb3f72f00dee82ebf87d019c626` was not changed. Native `hermes-mailbox.service.ts` source identity guard rejects a fetched MIME when its byte length differs from the server's preceding RFC822.SIZE. This explains the live synthetic mailbox `MAIL_MESSAGE_CHANGED` failure before parsing. No guard was relaxed.

GreenMail 2.1.9 computes message size from the body only in `SimpleMessageAttributes`, while FETCH BODY serializes headers plus body. Upstream 2.1.15 computes size using full `part.writeTo(...)` serialization instead:

- https://github.com/greenmail-mail-test/greenmail/blob/release-2.1.9/greenmail-core/src/main/java/com/icegreen/greenmail/store/SimpleMessageAttributes.java
- https://github.com/greenmail-mail-test/greenmail/blob/release-2.1.15/greenmail-core/src/main/java/com/icegreen/greenmail/store/SimpleMessageAttributes.java
- https://github.com/greenmail-mail-test/greenmail/blob/release-2.1.9/greenmail-core/src/main/java/com/icegreen/greenmail/imap/commands/FetchCommand.java

## Actual cloud protocol proof

| Isolated fixture | CI run / source commit | UID | RFC822.SIZE | Full MIME bytes | Bounded partial bytes | Native strict size condition |
| --- | --- | --- | --- | --- | --- | --- |
| GreenMail 2.1.9 | [41227726342](https://github.com/claude972/test-Crm/actions/runs/41227726342), `33fac83e6854a04a197b9195b35af5076846db65` | 1 | 40 | 445 | 445 | false |
| GreenMail 2.1.15 | [41227923056](https://github.com/claude972/test-Crm/actions/runs/41227923056), `52183b2df7176ada0cb8f4a2eeeb58c818fd2b27` | 1 | 445 | 445 | 445 | true |

Both runs passed synthetic authenticated SMTPS deposit, authenticated IMAPS fetch with CA/SAN verification, and unconditional cleanup verification (Docker, forwarders, host mapping, private files). No MIME contents or credentials were emitted by the new probe. The corrected probe additionally asserts RFC822.SIZE equality.

The new OCI index pin is `greenmail/standalone:2.1.15@sha256:309ba544ea482e5d4265d09921cdab07c8dad2cc4481d715c9b8ff5d3f0a149f`, verified against Docker Registry's public manifest digest before committing.

## Delivered scope and limitations

Changes only affect the fixture image pin, protocol smoke probe, and its dedicated branch CI trigger. Local syntax checks, 11 fixture boundary/TLS/cleanup unit tests, diff whitespace checks and redacted Gitleaks scan passed. No local database, native CRM service, real mailbox or real external delivery was used.

This proves the fixture protocol correction, not native mailbox UI opening. Existing running candidate508 remains on its original fixture until the owner recreates the isolated preview fixture/runtime with this pin. Retest opening the synthetic message in the UI after that recreation before reporting the mail-reading acceptance criterion as passed.
