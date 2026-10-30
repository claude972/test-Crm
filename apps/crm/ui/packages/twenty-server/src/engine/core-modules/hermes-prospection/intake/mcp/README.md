# Hermes MCP draft adapter

`HermesMcpBotAdapter` is a server-only HTTP MCP client. It produces a draft for human review and has no message dispatch operation. No external Hermes MCP endpoint or tool was verified in this repository. The CRM's existing inbound `/mcp` server is not evidence of an external reply-generation service.

## Runtime integration

Construct `new HermesMcpBotAdapter(config.get('HERMES_MCP_CONNECTIONS'))` and register it through the exported messaging registry's `registerBot` during module initialization. Providing a token only in a parent Nest module does not make it visible in a child module. The adapter structurally implements `HermesMessagingBotAdapter` without depending on the messaging module.

The messaging service must obtain message text and workspace identity from its authorized persisted conversation. `draftReply({workspaceId, conversationId, messageId, text, channel})` accepts UUID identifiers, bounded text (1–10,000 characters), and channel `EMAIL` or `WHATSAPP`. Success returns `{provider:'HERMES_MCP', mode:'DRAFT', status:'READY', text}`. Absent workspace configuration returns `MANUAL/NOT_CONFIGURED`; configuration, network, protocol, schema, or tool failure returns `MANUAL/UNAVAILABLE`. No diagnostic, token, endpoint, or input text is returned on failure.

`HERMES_MCP_CONNECTIONS` is a sensitive server-only JSON object, default `{}`, keyed by workspace UUID. Each entry has:

- `endpoint`: operator-provided HTTPS MCP endpoint, without credentials, query, or fragment;
- `token`: separate scoped Bearer credential, 32–4096 visible ASCII characters;
- `toolName`: exact operator-audited reply-drafting tool name;
- `protocolVersion`: optional literal `2025-11-25`;
- `argumentMap`: required `text`; optional `conversationId`, `messageId`, `channel`, `workspaceId`. Values are the corresponding advertised tool argument field names and must be distinct.

No default endpoint, tool, global workspace, or shared credential fallback exists. Duplicate credentials across workspaces are rejected. Each draft uses an isolated MCP session. Serialized secrets live in a JavaScript private field excluded from JSON serialization.

## Supported protocol and security boundary

This implementation supports the **2025-11-25 Streamable HTTP profile**: `initialize`, `notifications/initialized`, bounded `tools/list`, then one `tools/call`. It accepts JSON and SSE RPC responses, including a matching SSE result before the server closes the stream. It supports session headers and requires exact protocol agreement. It does not implement OAuth discovery, subscription GET, resumability, legacy standalone SSE transport, or other protocol versions.

References: [transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

Only the configured tool is callable. It must advertise `readOnlyHint: true` and must not advertise `destructiveHint: true`. These hints are advisory: operators must audit the actual tool and restrict its credentials to drafting. The client cannot guarantee an external server obeys its hints. No transport callback can invoke CRM sending.

Input and optional structured output are checked against the advertised schema. The deliberately conservative JSON Schema profile is a flat object with primitive properties (string, number, integer, boolean, null), enum/const, basic string/numeric constraints, required, and additionalProperties. Undeclared values, missing required fields, nested objects/arrays, references, and schema composition fail closed. Unsupported schemas are not approximated.

Native SSRF-safe agents perform DNS/IP checks. Redirects, environment proxies, URL credentials, and caller-selected endpoints are disabled. Default private/internal destinations are blocked before a socket opens. An optional constructor-only exact `allowedInternalHosts` list supports operator-controlled deployments and isolated loopback fixtures; no wildcard or JSON configuration can enable it. HTTP is only syntactically allowed for `127.0.0.1` fixtures and is still blocked by default. A whole exchange has an 8-second default deadline (maximum 10 seconds), three list pages, 100 tools/page, 128 KB per response, 32 KB per request, and a 10,000-character draft limit. Errors are generic; no retries or message sending occur.

## Verification

The adapter suite uses real ephemeral loopback HTTP servers with explicit fixture-only internal-host allowance. It exercises lifecycle, Bearer/session headers, mapping, SSE without connection close, workspace isolation, SSRF, redirects, missing/writable tools, protocol/schema failures, malformed IDs, authentication failures, response bounds, tool errors, and deadlines. Together with intake suites: 31 tests pass. A targeted strict TypeScript check extending the actual server configuration passes with incremental disabled. No PostgreSQL/Redis daemon, external MCP service, production mailbox, or real prospect was contacted. Full backend build and integrated registry execution remain for root CI.
