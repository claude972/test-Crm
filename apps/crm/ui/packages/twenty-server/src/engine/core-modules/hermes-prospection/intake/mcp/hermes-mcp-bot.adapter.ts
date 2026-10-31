import { randomUUID } from 'node:crypto';
import { type Readable } from 'node:stream';

import axios from 'axios';
import { z } from 'zod';

import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';
import {
  authorizedToolNames,
  discoveryInputSchema,
  draftInputSchema,
  type HermesMcpConnection,
  type HermesMcpDiscoveredTool,
  type HermesMcpDiscoveryResult,
  type HermesMcpDraftInput,
  type HermesMcpDraftResult,
  type HermesMcpToolRefusal,
  parseHermesMcpConnections,
} from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp.schema';
import { validateHermesMcpSchema } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-schema-validation';
import { readHermesMcpRpcResult } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-rpc';

const toolSchema = z
  .object({
    name: z.string(),
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
    annotations: z
      .object({
        readOnlyHint: z.literal(true),
        destructiveHint: z.literal(false).optional(),
      })
      .passthrough(),
  })
  .passthrough();
type Tool = z.infer<typeof toolSchema>;
// Discovery must describe what the server advertises even when the entry would
// fail the callable profile, so it reads the same fields without asserting the
// read-only grant that `toolSchema` requires before a call.
const advertisedToolSchema = z
  .object({
    name: z.string().min(1).max(128),
    title: z.string().max(200).optional(),
    inputSchema: z.record(z.string(), z.unknown()).optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
    annotations: z
      .object({
        readOnlyHint: z.boolean().optional(),
        destructiveHint: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
type Options = {
  timeoutMs?: number;
  allowedInternalHosts?: string[];
  assertCurrent?: () => Promise<void>;
};
type Rpc = (
  method: string,
  params?: Record<string, unknown>,
  notification?: boolean,
) => Promise<unknown>;
type ListedTools = { tools: unknown[]; truncated: boolean };
type Session = {
  rpc: Rpc;
  // `stopWhen` preserves the drafting path's exact request sequence: it stops
  // at the page holding the configured tool instead of always draining every
  // page, which only discovery needs.
  listTools: (stopWhen?: (tools: unknown[]) => boolean) => Promise<ListedTools>;
};

export class HermesMcpBotAdapter {
  readonly #serializedConnections: string;
  private readonly timeoutMs: number;
  private readonly allowedInternalHosts: string[];

  constructor(
    serializedConnections: string,
    private readonly options: Options = {},
  ) {
    this.#serializedConnections = serializedConnections;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.allowedInternalHosts = [...(options.allowedInternalHosts ?? [])];
    if (
      !Number.isInteger(this.timeoutMs) ||
      this.timeoutMs < 10 ||
      this.timeoutMs > 10_000 ||
      this.allowedInternalHosts.some(
        (host) => !/^[a-z0-9.:[\]-]+$/.test(host) || host === '*',
      )
    )
      throw new Error('Invalid MCP client options');
  }

  private connectionFor(workspaceId: string): HermesMcpConnection | undefined {
    const connections = parseHermesMcpConnections(this.#serializedConnections);
    return Object.prototype.hasOwnProperty.call(connections, workspaceId)
      ? connections[workspaceId]
      : undefined;
  }

  // Opens one isolated MCP session for a single company's connection, runs the
  // caller's exchange, then tears the transport down unconditionally. Only the
  // resolved connection of that workspace is reachable here, so no other
  // company's endpoint, credential or context can enter the exchange.
  private async withSession<T>(
    connection: HermesMcpConnection,
    body: (session: Session) => Promise<T>,
  ): Promise<T> {
    let httpAgent: ReturnType<typeof createSsrfSafeAgent> | undefined;
    let httpsAgent: ReturnType<typeof createSsrfSafeAgent> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    try {
      httpAgent = createSsrfSafeAgent('http', this.allowedInternalHosts);
      httpsAgent = createSsrfSafeAgent('https', this.allowedInternalHosts);
      timer = setTimeout(() => abort.abort(), this.timeoutMs);
      let sessionId: string | undefined;
      const rpc: Rpc = async (method, params, notification = false) => {
        const id = randomUUID();
        await this.options.assertCurrent?.();
        const response = await axios.post<Readable>(
          connection.endpoint,
          {
            jsonrpc: '2.0',
            ...(notification ? {} : { id }),
            method,
            ...(params ? { params } : {}),
          },
          {
            headers: {
              Authorization: `Bearer ${connection.token}`,
              Accept: 'application/json, text/event-stream',
              'Content-Type': 'application/json',
              ...(method === 'initialize'
                ? {}
                : { 'MCP-Protocol-Version': connection.protocolVersion }),
              ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
            },
            responseType: 'stream',
            httpAgent,
            httpsAgent,
            proxy: false,
            maxRedirects: 0,
            timeout: this.timeoutMs,
            signal: abort.signal,
            maxBodyLength: 32_000,
            validateStatus: () => true,
          },
        );
        if (notification) {
          response.data.destroy();
          if (response.status !== 202)
            throw new Error('MCP notification refused');
          return undefined;
        }
        if (response.status !== 200) {
          response.data.destroy();
          throw new Error('MCP request refused');
        }
        const returnedSession: unknown = response.headers['mcp-session-id'];
        if (returnedSession !== undefined) {
          if (
            typeof returnedSession !== 'string' ||
            !/^[A-Za-z0-9._~-]{1,200}$/.test(returnedSession) ||
            (sessionId !== undefined && sessionId !== returnedSession)
          ) {
            response.data.destroy();
            throw new Error('Invalid MCP session');
          }
          sessionId = returnedSession;
        }
        return readHermesMcpRpcResult(
          response.data,
          String(response.headers['content-type'] ?? ''),
          id,
        );
      };
      const initialized = z
        .object({
          protocolVersion: z.literal('2025-11-25'),
          capabilities: z
            .object({ tools: z.object({}).passthrough() })
            .passthrough(),
          serverInfo: z
            .object({ name: z.string(), version: z.string() })
            .passthrough(),
        })
        .passthrough()
        .parse(
          await rpc('initialize', {
            protocolVersion: connection.protocolVersion,
            capabilities: {},
            clientInfo: { name: 'hermes-crm-draft-client', version: '1.0.0' },
          }),
        );
      if (initialized.protocolVersion !== connection.protocolVersion)
        throw new Error('MCP version mismatch');
      await rpc('notifications/initialized', undefined, true);
      const listTools = async (
        stopWhen?: (tools: unknown[]) => boolean,
      ): Promise<ListedTools> => {
        const collected: unknown[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < 3; page++) {
          const listed = z
            .object({
              tools: z.array(z.unknown()).max(100),
              nextCursor: z.string().max(2048).optional(),
            })
            .parse(await rpc('tools/list', cursor ? { cursor } : {}));
          collected.push(...listed.tools);
          if (stopWhen?.(collected) === true || !listed.nextCursor)
            return { tools: collected, truncated: false };
          cursor = listed.nextCursor;
        }
        // Three pages exhausted with a cursor still pending: the advertised set
        // is reported incomplete rather than silently treated as whole.
        return { tools: collected, truncated: true };
      };
      return await body({ rpc, listTools });
    } finally {
      if (timer) clearTimeout(timer);
      abort.abort();
      httpAgent?.destroy();
      httpsAgent?.destroy();
    }
  }

  // Read-only tool discovery: it runs the lifecycle and `tools/list` only and
  // has no `tools/call`, so inspecting a server can never execute one of its
  // tools. Every advertised entry is reported with the reason it is or is not
  // callable, so an operator grants an exact audited name instead of guessing.
  async discoverTools(input: {
    workspaceId: string;
  }): Promise<HermesMcpDiscoveryResult> {
    const unavailable: HermesMcpDiscoveryResult = {
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    };
    try {
      discoveryInputSchema.parse(input);
      const connection = this.connectionFor(input.workspaceId);
      if (!connection)
        return {
          status: 'NOT_CONFIGURED',
          provider: 'HERMES_MCP',
          authorizedTools: [],
          draftingTool: null,
          tools: [],
          truncated: false,
        };
      const granted = authorizedToolNames(connection);
      const listed = await this.withSession(connection, ({ listTools }) =>
        listTools(),
      );
      const advertised = listed.tools
        .map((candidate) => advertisedToolSchema.safeParse(candidate))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
      const occurrences = new Map<string, number>();
      for (const entry of advertised)
        occurrences.set(entry.name, (occurrences.get(entry.name) ?? 0) + 1);
      const tools: HermesMcpDiscoveredTool[] = [];
      const reported = new Set<string>();
      for (const entry of advertised) {
        if (reported.has(entry.name)) continue;
        reported.add(entry.name);
        const authorized = granted.includes(entry.name);
        const refusals: HermesMcpToolRefusal[] = [];
        if (!authorized) refusals.push('NOT_AUTHORIZED');
        if ((occurrences.get(entry.name) ?? 0) > 1)
          refusals.push('DUPLICATE_NAME');
        if (entry.annotations?.readOnlyHint !== true)
          refusals.push('NOT_READ_ONLY');
        if (entry.annotations?.destructiveHint === true)
          refusals.push('DESTRUCTIVE');
        if (!this.schemaIsSupported(entry.inputSchema))
          refusals.push('UNSUPPORTED_SCHEMA');
        tools.push({
          name: entry.name,
          title: entry.title ?? null,
          authorized,
          callable: refusals.length === 0,
          refusals,
          isDraftingTool: entry.name === connection.toolName,
        });
      }
      return {
        status: 'READY',
        provider: 'HERMES_MCP',
        authorizedTools: [...granted],
        draftingTool: connection.toolName,
        tools,
        truncated: listed.truncated,
      };
    } catch {
      return unavailable;
    }
  }

  // An advertised schema is reported supported only when the conservative flat
  // profile accepts it; this never approximates a richer schema.
  private schemaIsSupported(schema: Record<string, unknown> | undefined) {
    if (!schema) return false;
    try {
      validateHermesMcpSchema(schema, {});
      return true;
    } catch (error) {
      // A missing required argument proves the profile accepted the schema
      // itself; only a schema-shape refusal makes it unsupported.
      return (
        error instanceof Error &&
        error.message === 'Missing MCP schema requirement'
      );
    }
  }

  async draftReply(input: HermesMcpDraftInput): Promise<HermesMcpDraftResult> {
    const unavailable: HermesMcpDraftResult = {
      mode: 'MANUAL',
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
    };
    try {
      draftInputSchema.parse(input);
      const connection = this.connectionFor(input.workspaceId);
      if (!connection)
        return {
          mode: 'MANUAL',
          status: 'NOT_CONFIGURED',
          provider: 'HERMES_MCP',
        };
      // The drafting tool must hold an explicit operator grant. The parsed
      // configuration already guarantees it; re-checking at the call site
      // keeps the refusal here rather than trusting the parse alone.
      if (!authorizedToolNames(connection).includes(connection.toolName))
        throw new Error('MCP tool not authorized');
      return await this.withSession(connection, async ({ rpc, listTools }) => {
        const listed = await listTools((tools) =>
          tools.some(
            (candidate) =>
              typeof candidate === 'object' &&
              candidate !== null &&
              'name' in candidate &&
              candidate.name === connection.toolName,
          ),
        );
        let tool: Tool | undefined;
        for (const candidate of listed.tools) {
          if (
            typeof candidate === 'object' &&
            candidate !== null &&
            'name' in candidate &&
            candidate.name === connection.toolName
          ) {
            if (tool) throw new Error('Duplicate MCP tool');
            tool = toolSchema.parse(candidate);
          }
        }
        if (!tool) throw new Error('Configured MCP tool unavailable');
        const argumentsValue = this.buildArguments(connection, input);
        validateHermesMcpSchema(tool.inputSchema, argumentsValue);
        const result = z
          .object({
            isError: z.boolean().optional(),
            content: z
              .array(
                z
                  .object({ type: z.string(), text: z.string().optional() })
                  .passthrough(),
              )
              .max(32)
              .optional(),
            structuredContent: z.unknown().optional(),
          })
          .passthrough()
          .parse(
            await rpc('tools/call', {
              name: connection.toolName,
              arguments: argumentsValue,
            }),
          );
        if (result.isError) throw new Error('MCP tool refused');
        if (tool.outputSchema)
          validateHermesMcpSchema(tool.outputSchema, result.structuredContent);
        const text = result.content
          ?.filter((part) => part.type === 'text')
          .map((part) => part.text ?? '')
          .join('\n')
          .trim();
        if (!text || text.length > 10_000)
          throw new Error('No bounded MCP draft text');
        await this.options.assertCurrent?.();
        return {
          mode: 'DRAFT' as const,
          status: 'READY' as const,
          provider: 'HERMES_MCP' as const,
          text,
        };
      });
    } catch {
      return unavailable;
    }
  }

  private buildArguments(
    connection: HermesMcpConnection,
    input: HermesMcpDraftInput,
  ): Record<string, string> {
    const argumentsValue: Record<string, string> = {};
    for (const [source, target] of Object.entries(connection.argumentMap))
      argumentsValue[target] = input[source as keyof HermesMcpDraftInput];
    return argumentsValue;
  }
}
