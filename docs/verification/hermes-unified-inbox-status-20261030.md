# Hermès — unified inbox verification checkpoint

Verified backend source: `bae02ca00b17d4b04faa39de142d03601f24a0ee`, independent run [41075842313](https://github.com/claude972/test-Crm/actions/runs/41075842313), completed successfully at 15:03:44 UTC on 30 October 2026.

The run passed production typechecking, compilation, startup, native client configuration, 201 historical unit tests and 177 additional unit tests. The registered official inbox migration passed PostgreSQL up/down/up, workspace isolation, eight concurrent replay claims, client identity uniqueness, cursor persistence and cascading deletion. Native HTTP/ORM suites passed: seven dashboard, seven prospection and seven inbox scenarios.

The official migration contains three workspace-scoped tables. Its generation also proposed an unrelated equivalent JSON-default normalization on hermesImportState; review explicitly removed only that foreign up/down pair. The strict 13-statement migration scope was preserved. See inbox-migration-806f58-review.md.

Subsequent local verification: 190 new tests in 15 suites passed, including the SMTP deadline provider. After the last IMAP arrival-time guard, the mail suites passed 23 tests. SMTP negotiation and socket inactivity have real 15-second timeouts; a 30-second unanswered send remains UNCONFIRMED and is not automatically resent. The inbox uses authenticated IMAP arrival time ahead of an untrusted MIME Date header for bot delegation boundaries. Bot delegation disables automatic Apollo retries so an old AUTO request cannot silently override a human handoff.

The two additional native Forms/Cal scenarios and the final integrated frontend are pending final-SHA CI and browser acceptance at this checkpoint. No live WhatsApp, IMAP, SMTP, Hermès MCP, Forms bridge or Cal.diy service has been verified/configured in the disposable preview. Synthetic loopback and native fixture tests do not constitute a live provider connection. The Forms integration writes native CRM Notes, and Cal.diy writes native CalendarEvents and target links; no fictional FormResponse object is introduced.

The old internal preview run41052809170 expired at13:40UTC. It is historical evidence only. Final delivery requires a new exact-source frontend/backend preview, protected deployment sharing, a new synthetic account, an explicit expiry and an actual browser check without prior Vercel login. Offline installation has not yet been asserted merely from the presence of a PWA manifest.
