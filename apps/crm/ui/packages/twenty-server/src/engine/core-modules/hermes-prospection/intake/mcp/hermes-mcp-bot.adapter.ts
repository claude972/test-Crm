import { randomUUID } from 'node:crypto';
import { type Readable } from 'node:stream';

import axios from 'axios';
import { z } from 'zod';

import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';
import {
  draftInputSchema,
  type HermesMcpConnection,
  type HermesMcpDraftInput,
  type HermesMcpDraftResult,
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
type Options = { timeoutMs?: number; allowedInternalHosts?: string[] };

export class HermesMcpBotAdapter {
  readonly #serializedConnections: string;
  private readonly timeoutMs: number;
  private readonly allowedInternalHosts: string[];

  constructor(serializedConnections: string, options: Options = {}) {
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

  async draftReply(input: HermesMcpDraftInput): Promise<HermesMcpDraftResult> {
    const unavailable: HermesMcpDraftResult = {
      mode: 'MANUAL',
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
    };
    let httpAgent: ReturnType<typeof createSsrfSafeAgent> | undefined;
    let httpsAgent: ReturnType<typeof createSsrfSafeAgent> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    try {
      draftInputSchema.parse(input);
      const connections = parseHermesMcpConnections(
        this.#serializedConnections,
      );
      const connection = Object.prototype.hasOwnProperty.call(
        connections,
        input.workspaceId,
      )
        ? connections[input.workspaceId]
        : undefined;
      if (!connection)
        return {
          mode: 'MANUAL',
          status: 'NOT_CONFIGURED',
          provider: 'HERMES_MCP',
        };
      httpAgent = createSsrfSafeAgent('http', this.allowedInternalHosts);
      httpsAgent = createSsrfSafeAgent('https', this.allowedInternalHosts);
      timer = setTimeout(() => abort.abort(), this.timeoutMs);
      let sessionId: string | undefined;
      const rpc = async (
        method: string,
        params?: Record<string, unknown>,
        notification = false,
      ): Promise<unknown> => {
        const id = randomUUID();
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
      let tool: Tool | undefined;
      let cursor: string | undefined;
      for (let page = 0; page < 3; page++) {
        const listed = z
          .object({
            tools: z.array(z.unknown()).max(100),
            nextCursor: z.string().max(2048).optional(),
          })
          .parse(await rpc('tools/list', cursor ? { cursor } : {}));
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
        if (tool || !listed.nextCursor) break;
        cursor = listed.nextCursor;
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
      return { mode: 'DRAFT', status: 'READY', provider: 'HERMES_MCP', text };
    } catch {
      return unavailable;
    } finally {
      if (timer) clearTimeout(timer);
      abort.abort();
      httpAgent?.destroy();
      httpsAgent?.destroy();
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
