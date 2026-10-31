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

## Tool discovery and explicit authorization (R09)

The callable tool set is the runtime intersection of what the company's own MCP
server advertises and what its operator explicitly granted. There is no
hardcoded tool list.

`authorizedTools` is the operator grant: 1–32 distinct names, and `toolName`
must itself be granted. Absent, the grant is exactly the drafting tool, so an
existing connection keeps its current single-tool authorization. A grant list
that repeats a name, or that omits the drafting tool, is refused at parse time
before any request leaves the server.

`discoverTools({workspaceId})` runs `initialize`, `notifications/initialized`
and the bounded `tools/list` only. It has no `tools/call`: inspecting a server
can never execute one of its tools. It returns
`{status,provider,authorizedTools,draftingTool,tools,truncated}` where each
advertised entry is `{name,title,authorized,callable,refusals,isDraftingTool}`.
`refusals` is why an advertised tool is not callable: `NOT_AUTHORIZED`,
`DUPLICATE_NAME`, `NOT_READ_ONLY`, `DESTRUCTIVE`, `UNSUPPORTED_SCHEMA`. A tool
the operator granted is still refused when the server's own hints or the
auditable flat schema profile reject it. Three pages exhausted with a cursor
still pending sets `truncated`, reported as an incomplete advertised set rather
than treated as the whole list. `status` is `NOT_CONFIGURED` for a company
without a mapping, `READY` when the server answered, `UNAVAILABLE` otherwise;
no endpoint, credential or provider diagnostic is returned.

The connection and its revision are rechecked after the **complete** collection
and before anything is handed back, including after the final page. The
per-request guard only runs before each POST, so without that recheck a
rotation or deletion landing while the last `tools/list` response was in flight
would publish a stale tool list and stale grants as `READY`. It now answers
`UNAVAILABLE` with an empty surface.

`READY` states what the server advertises. It is never evidence that the
drafting tool works, that the provider is reachable for a real draft, or that
any external Hermes MCP service exists. No external MCP endpoint or tool is
verified in this repository.

## Browser query (metadata GraphQL)

`hermesMcpToolSurface` takes **no argument**: the company is the authenticated
session's own workspace, never a caller-selected one, and only a standard
non-impersonated user session is accepted. Fresh native unrestricted-admin
authorization runs before the exchange and is rechecked after it, so a role
revoked while the server was answering does not deliver the tool list.

```graphql
query HermesMcpToolSurface {
  hermesMcpToolSurface {
    status checkedAt errorCode authorizedTools draftingTool truncated
    tools { name title authorized callable refusals isDraftingTool }
  }
}
```

`status` adds `CONFIGURATION_ERROR` for an unreadable private configuration.
`errorCode` is a generic `HERMES_MCP_DISCOVERY_UNAVAILABLE` or
`HERMES_MCP_CONFIGURATION_UNAVAILABLE`; no raw diagnostic, token, endpoint or
operator identity is exposed. The authoritative source is the stored-connection
adapter when it is wired, otherwise the private configuration map.
