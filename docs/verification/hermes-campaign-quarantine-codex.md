# Native campaign send-outcome quarantine

Base: `afe9558d7721fa5d179ad21e4caeb2ff25def882`. Scope: native campaign delivery/retry chain and sender suppression canonicalization. No SMTP driver or unsubscribe service changes, migrations, credentials, cloud operations or database services.

## Contract

- New `EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED` means transport may have accepted the message but acknowledgement is missing. Root's SMTP driver must emit this code for uncertain post-DATA outcomes and preserve it in batch `errorCode`.
- Batch `errorCode` is optional and survives sender recipient-index remapping. Explicit uncertainty overrides a contradictory local message ID. Missing provider entries are also uncertain, rather than retryable generic failures.
- Existing state `FAILED` plus existing TEXT field `failureReason=SEND_OUTCOME_UNCONFIRMED` constitutes quarantine. No `SENT`, provider acknowledgement, `sentAt`, `deliveredAt`, billing or message success is invented for that result. Known temporary errors and generic pre-existing retry behavior are retained.
- A durable marker is written under the current SENDING claim before transport. All single/batch claim criteria exclude it. Failed settlement/recovery/finally writes and expired-claim cleanup preserve quarantine; stale-queued and cancellation cleanup cannot overwrite it. This conservatively quarantines a crash immediately before transport too: manual reconciliation is required before any operator elects to retry. It does not claim SMTP exactly-once delivery.
- Finalized acknowledged outcomes can still become SENT using their real provider message ID. Uncertain outcomes cannot. No automatic quarantine release is introduced.

## Suppression dependency

Apply alongside `3537cc542` (prospection agent): the shared `getSoleEnvelopeRecipient` implementation must return one validated normalized bare address. Sender suppression lookup/comparison and batch pre-slot estimates use that helper while preserving original display names for the provider. Ambiguous or malformed addresses fail before transport. This branch deliberately does not edit that shared helper or UnsubscribeContentService.

## Verification

36 tests passed across six Jest suites: native delivery quarantine (8), sender canonicalization/code propagation (3), send failure resolution, batch settlement resolution, existing SQL settlement construction and existing campaign terminal status. Native service fixtures exercise the public simple/batch jobs with stateful repository criteria and actual lifecycle expiry handling: retrying a quarantined job cannot emit a second message, even after failed failure persistence or failed batch settlement and recovery; temporary single and batch failures remain retryable. No live mail is sent.

Local composition used the exact helper source from commit `3537cc542` through a temporary external Jest module mapping (the branch base still has its older helper). A first sender run against the older helper correctly failed canonicalization assertions; the composed run passed. Jest/SWC toolchain was read-only from installed dependencies; no original env/runtime files were accessed. Formatting and `git diff --check` passed. Full production typecheck, real PostgreSQL concurrency/crash recovery and SMTP/network integration were not run; parent CI/integration must verify the combined revision.

Run selected suites with the project's server Jest config after building shared dependencies; paths:

- `src/modules/emailing/services/__tests__/campaign-unconfirmed-quarantine.spec.ts`
- `src/modules/emailing/services/__tests__/emailing-domain-sender-quarantine.spec.ts`
- `src/modules/emailing/utils/__tests__/resolve-campaign-send-failure.util.spec.ts`
- `src/modules/emailing/utils/__tests__/resolve-campaign-batch-settlements.util.spec.ts`
- `src/modules/emailing/utils/__tests__/build-campaign-delivery-settle-query.util.spec.ts`
- `src/modules/emailing/utils/__tests__/compute-campaign-terminal-status.util.spec.ts`
