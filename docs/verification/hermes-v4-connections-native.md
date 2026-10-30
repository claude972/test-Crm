# V4 connections: native migration evidence

Source checkpoint: `d78da58292081c82fd55f65a7cbf4fd14dc53cb4`.
Baseline: B official media migration `4f1fc140b7ed3a8118f93c552fed8858831a86c4`.

- [Production compilation and 332 targeted tests in 29 suites](https://github.com/claude972/test-Crm/actions/runs/41144188365): passed.
- [Official native 2.52 generator and PostgreSQL verification](https://github.com/claude972/test-Crm/actions/runs/41144188347): passed.
- The exact downloaded native patch adds `1793403069092-add-hermes-connections` and its generated instance-command registration. No manual migration or manifest editing.
- Six up statements only: `core.hermesConnection`, four unique indexes, workspace cascade FK. Six reverse statements. The native upgrade-aware metadata candidate equals the generated command; feature up, baseline down and feature re-up all converge.
- CommandModule supplies native upgrade-aware metadata/generation. SERVER `AppModule.init()` and WORKER `QueueWorkerModule` initialize without listening, and both resolve the same native connections singleton through the class and shared reader token.
- PostgreSQL with a one-connection service pool verifies native encrypted save/workspace AAD, competing CAS writes with one winner, duplicate-secret rejection, unrelated corrupt-tenant ciphertext independence, a stale revision rejected after an observed server-side advisory-lock wait with zero transaction writes, monotone tombstones/recreation and workspace cascade cleanup.

Authorization in these PostgreSQL storage tests is an explicit allowed-actor fixture. Native role/session authorization has separate unit and integration coverage; these storage assertions do not claim a complete authenticated browser journey. No provider request, real credential or delivery is used.

The baseline's seven historical removed columns remain removed through native `UpgradeAwareEntityMetadataAdapter`. Its JSONB default text-order difference is proved semantically equal in PostgreSQL and normalized only in disposable in-memory metadata. No schema synchronization or production baseline repair is performed.

Additional native B ingress race tests are a separate test-only checkpoint and were not executed by the first generator run above. They must be verified by the subsequent compiled-command run; do not attribute them to the first run.
