# WhatsApp enrollment and connection center frontend

## Scope and source

Base: 3c5a96afa3ed06c5289539be5680cf202e56668b. Ownership published before edits in coordination claim 1b5625087. This slice changes only the existing connection center and the new hermes-whatsapp-setup frontend module. It adds no service, provider secret, backend mutation, global navigation or message sender.

The center now puts WhatsApp association, effective bot settings and the MCP connection form first. Short orientation distinguishes WhatsApp conversations, the mail inbox and connection settings. Existing manual WhatsApp configuration and capability lists remain available in disclosures; existing permission and stale-session checks remain authoritative. Opening the MCP form moves keyboard focus to its container. The environment-variable hint has been removed from the product flow.

## Native enrollment

Four agreed metadata mutations return a JSON scalar: Start, Qr, Status and Activate. The UI never requests a provider URL, key or instance identifier. Association and incoming activation remain separate; provider OPEN does not claim that a message exchange passed. Activation is offered only with the effective bot policy OFF. QR and optional phone pairing code are explicitly requested by the user, with no automatic retries. Only provider status is read when this section mounts.

Apollo uses no-cache and skipRetry. Scope includes workspace, live user/workspace session identity and connection revision. Epoch guards discard pending responses and synchronously hide previous QR, code, telephone and errors when that scope changes. A synchronous pending-operation lock prevents duplicate clicks. An uncertain write requires a status read before another write. Native session replacement, revision conflicts, refusals and authorization failures have distinct fail-closed states. The reader validates the public response and permits only PNG data URLs. Credentials expire from React state after the server's short display lease, explicitly described as an application display limit rather than a WhatsApp TTL.

## Validation

- New-module first run: 21 tests passed across 3 suites.
- First combined run: 43 passed, 2 failed. One existing mocked MCP read was still loading under its random MockLink delay; its fixture now declares zero delay. The real-time lease test was replaced by deterministic fake timers, preserving the expiry assertion.
- Combined rerun: 45 tests passed across 5 suites, normal exit with detectOpenHandles.
- Additional session-superseded/server-refusal and MCP keyboard-focus counterexamples: 24 tests passed across the 3 affected suites.
- Final combined run: 47 tests passed across all 5 suites in 8.85 seconds, normal exit with detectOpenHandles (current source).
- git diff --check passed before final commit.

Tests cover workspace/session/revision changes during an unresolved QR request, duplicate creation clicks, uncertain-write recovery, no automatic credential request, no-cache/skipRetry, expired credentials, malformed responses, typed and accessible telephone input, explicit activation, bot AUTO refusal and native connection controls.

Local proof logs are private temporary artifacts: /private/tmp/kovaalabcrm-wa-self-service-final-tests.log, /private/tmp/kovaalabcrm-wa-self-service-refusals-tests.log and /private/tmp/kovaalabcrm-wa-self-service-47-tests.log. No credentials or live QR images are included in this report.

## Limits

No real device pairing, incoming message, MCP execution, provider connection or browser recipe was performed by this slice. No full application TypeScript/build run was performed locally; the parent owns the native CI and exact-source staging preview. Backend contract integration must be verified against the backend owner's immutable commit. Provider availability, authorization and existing connection revision are read from the real server; absence or unknown states are not presented as connected. The prior workspace and WhatsApp bot OFF settings are not changed by this frontend.
