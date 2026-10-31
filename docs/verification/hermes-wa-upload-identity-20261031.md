# CAT-WA-005 — accepted upload identity

Owner: Codex preview_pwa, after the explicit Claude handoff and file freeze. Branch: `fix/hermes-wa-upload-identity-20261031`. Base: `9eea9c8ed7b01846fb7e3046669c41ef4a4af066` (ba35 and Claude's ArrayBuffer fixture correction). Claims were published before edits on coordination commits `28f9a72e2` and `9e4636a29`.

## Behavior

An upload now returns a synchronous boolean: true only when its request acquires the hook's lock and passes local validation. This means acceptance for preparation, never readiness or provider delivery. The composer records uploadedSource only after that true result. A second selection and upload click rejected while A is pending can no longer replace the identity of A with B; A remains unsendable under B's preview. B can be uploaded and sent after a new human action once the first attempt settles.

The recorder exposes an optional onRecordingRequested callback through its existing human event handlers. The composer clears its previous displayed identity before Record/Record again/Try again, receives the new identity onClipReady, and clears it on cancellation. No effect starts recording or a network call. Existing callers remain compatible. Provider permissions, MIME/asset-kind handling, transport retries and server guards are unchanged.

Files: composer and tests, upload hook and tests, recorder and tests. No bot-policy, MCP, Opus fixture, locale catalog or other contributor's work was edited. Other WIP remains in the original Claude checkout.

## Verification performed

Three targeted Jest suites, **44 tests PASS**: HermesWaRuntimeComposer, useHermesWaMediaUpload and HermesWaVoiceRecorder. Run with the existing shared dependencies, one worker, explicit source root and `--detectOpenHandles`; final run completed normally in about 14 seconds. Private local configuration: `/private/tmp/hermes-wa-upload-recovery-jest.json`.

Coverage includes:

- Choose B **and click its upload** while A finalize is pending: only A's preparation runs, A is not sendable under B, no reply mutation; after A settles a new human upload and send uses B's asset.
- Choosing B after A is READY immediately withdraws A's send action while preserving explicit draft discard.
- Real recorder/composer components with a simulated browser MediaRecorder: file A pending, new voice clip B selected and submitted during the lock; A stays unsendable. After the new clip's accepted upload, its AUDIO asset is sent.
- Record again withdraws the old READY voice asset before another clip exists; cancelling does not restore the old send action. The callback never fires at mount.
- Synchronous accepted/rejected results while locked; reverse resolution after reset; delayed cancellation cannot overwrite a newer accepted upload. The previous scoped cancellation and local refusal tests remain intact.

Earlier runs: the initial hook/composer set passed 28 tests. The expanded set initially had 43 passes and one test-locator failure because file and recorder both expose Cancel. The locator now scopes the voice region; no production behavior or assertion was weakened. An earlier run without open-handle diagnostics reported a forced worker exit; the final diagnostic run passed and exited normally.

Formatting was applied to changed production/runtime tests. Unrelated pre-existing recorder-test formatting was preserved. `git diff --check` passes.

## Bounds

These are component/hook tests with GraphQL, file upload and browser capture doubles. No real microphone, Evolution, native media store, provider conversion, message delivery or browser preview was exercised. The Ogg fixture is inherited from Claude and contains headers, not audio packets. No large local build or local database was started. Strict frontend compilation and combined preview integration remain root's cloud-CI checks. CAT-WA-004/STALE and its failure messages remain owned by Claude; the unknown-kind MIME fallback is outside this correction.
