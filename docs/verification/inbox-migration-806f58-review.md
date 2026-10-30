# Official inbox migration review

Source: `806f58ca350a80d479f17772cb8c17385d05238b`, GitHub run `41064341124`, artifact `12982602126`. Official CLI generated `AddHermesInboxFastInstanceCommand`, timestamp `1793367531202`, version `2.52.0`.

The preserved original artifact has 14 up and 14 down statements. Exactly one pair touches the older `hermesImportState.state` default. Its up JSON `{\"version\":1,\"batches\":[],\"campaignIds\":[]}` and down JSON `{\"batches\": [], \"version\": 1, \"campaignIds\": []}` are semantically equal; PostgreSQL JSONB normalizes key order and whitespace. This unrelated pair was removed from the official generated source after review, with root approval; no replacement SQL was invented. Old ImportState command remains unchanged.

The registered command contains only three CREATE TABLE statements, six CREATE INDEX statements, and four additive foreign keys, with exact reverse down statements. Composite `(workspaceId, conversationId)` references conversation `(workspaceId, id)`; workspace and conversation deletes cascade. Partial unique indexes enforce provider idempotence and per-workspace clientRequestId. Bot columns and providerMetadata are included. The strict existing 13-statement whitelist remains unchanged and rejects the original 14-statement result.

Actual PostgreSQL roundtrip did not run locally. Run the hosted `--verify-existing --reset-after` check after rebuild to prove up/down/up, cascade, cross-tenant FK and replay behavior. The generation CI failed safely before applying any inbox DDL.

Original generated command SHA256: `b8961cac58ce390646e46afaefea9b127c66373a8ef2e541d7130af517707772`.
Reviewed command SHA256: `17bcab6a958c355e36d01434b023be25a1b6488309124cc187bec17973efc5ff`.
