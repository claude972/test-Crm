import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';

import { HermesMcpBotAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter';

const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const token = randomBytes(32).toString('hex');
const toolName = 'fixture_draft_reply';
const draftInput = () => ({
  workspaceId,
  conversationId: randomUUID(),
  messageId: randomUUID(),
  text: 'Synthetic inbound question',
  channel: 'WHATSAPP' as const,
});

describe('Hermes MCP standard HTTP draft adapter — isolated loopback', () => {
  let server: Server;
  let redirected: Server;
  let endpoint: string;
  let redirectEndpoint: string;
  let redirectedRequests = 0;
  let mode = 'normal';
  const requests: {
    method: string;
    params?: Record<string, unknown>;
    authorized: boolean;
    session?: string;
    version?: string;
  }[] = [];
  const configuration = () =>
    JSON.stringify({
      [workspaceId]: {
        endpoint,
        token,
        toolName,
        protocolVersion: '2025-11-25',
        argumentMap: {
          text: 'prompt',
          conversationId: 'thread',
          messageId: 'message',
          channel: 'channel',
        },
      },
    });
  const adapter = (timeoutMs = 1500) =>
    new HermesMcpBotAdapter(configuration(), {
      allowedInternalHosts: ['127.0.0.1'],
      timeoutMs,
    });

  beforeAll(async () => {
    jest.useRealTimers();
    redirected = createServer((_request, response) => {
      redirectedRequests++;
      response.end('{}');
    });
    await new Promise<void>((resolve) =>
      redirected.listen(0, '127.0.0.1', resolve),
    );
    redirectEndpoint = `http://127.0.0.1:${(redirected.address() as AddressInfo).port}/mcp`;
    server = createServer(async (request, response) => {
      let text = '';
      for await (const chunk of request) text += String(chunk);
      const body = JSON.parse(text) as {
        id?: string;
        method: string;
        params?: Record<string, unknown>;
      };
      requests.push({
        method: body.method,
        params: body.params,
        authorized: request.headers.authorization === `Bearer ${token}`,
        session: request.headers['mcp-session-id'] as string | undefined,
        version: request.headers['mcp-protocol-version'] as string | undefined,
      });
      if (mode === 'redirect') {
        response.writeHead(302, { Location: redirectEndpoint });
        response.end();
        return;
      }
      if (mode === 'timeout') return;
      if (
        mode === 'auth' ||
        request.headers.authorization !== `Bearer ${token}`
      ) {
        response.writeHead(401);
        response.end();
        return;
      }
      if (body.method === 'notifications/initialized') {
        response.writeHead(202);
        response.end();
        return;
      }
      let result: unknown;
      if (body.method === 'initialize') {
        response.setHeader('Mcp-Session-Id', 'fixture-session');
        result = {
          protocolVersion: mode === 'version' ? '2026-07-28' : '2025-11-25',
          capabilities: { tools: {} },
          serverInfo: { name: 'synthetic-mcp', version: '1.0.0' },
        };
      } else if (body.method === 'tools/list') {
        result = {
          tools: [
            {
              name: mode === 'missing-tool' ? 'unconfigured_tool' : toolName,
              annotations: {
                readOnlyHint: mode !== 'writable-tool',
                destructiveHint: false,
              },
              inputSchema: {
                type: 'object',
                properties: {
                  prompt: { type: 'string' },
                  thread: { type: 'string' },
                  message: { type: 'string' },
                  channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL'] },
                },
                required:
                  mode === 'input-schema'
                    ? ['missingArgument']
                    : ['prompt', 'thread', 'message', 'channel'],
                additionalProperties: false,
              },
              ...(mode === 'output-schema'
                ? {
                    outputSchema: {
                      type: 'object',
                      properties: { reply: { type: 'string' } },
                      required: ['reply'],
                    },
                  }
                : {}),
            },
          ],
        };
      } else if (body.method === 'tools/call') {
        result = {
          content: [{ type: 'text', text: 'Synthetic draft for human review' }],
          ...(mode === 'tool-error' ? { isError: true } : {}),
          ...(mode === 'output-schema'
            ? { structuredContent: { reply: 42 } }
            : {}),
        };
      } else {
        response.writeHead(400);
        response.end();
        return;
      }
      const rpc = JSON.stringify({
        jsonrpc: '2.0',
        id: mode === 'wrong-id' ? 'unrelated-request' : body.id,
        result,
      });
      if (mode === 'sse' && body.method === 'tools/call') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream' });
        response.write(
          'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/message","params":{}}\n\n',
        );
        response.write(`event: message\ndata: ${rpc}\n\n`);
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      if (mode === 'oversize') response.end(' '.repeat(128_001));
      else response.end(rpc);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  });
  afterAll(async () => {
    for (const listener of [server, redirected]) {
      listener.closeAllConnections();
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
  });
  beforeEach(() => {
    mode = 'normal';
    requests.length = 0;
    redirectedRequests = 0;
  });

  it('initializes, discovers only the configured read-only tool and returns draft text, never a send', async () => {
    const input = draftInput();
    const result = await adapter().draftReply(input);
    expect(result).toEqual({
      provider: 'HERMES_MCP',
      mode: 'DRAFT',
      status: 'READY',
      text: 'Synthetic draft for human review',
    });
    expect(requests.map((request) => request.method)).toEqual([
      'initialize',
      'notifications/initialized',
      'tools/list',
      'tools/call',
    ]);
    expect(requests.every((request) => request.authorized)).toBe(true);
    expect(requests[3].session).toBe('fixture-session');
    expect(requests[3].version).toBe('2025-11-25');
    expect(requests[3].params).toEqual({
      name: toolName,
      arguments: {
        prompt: input.text,
        thread: input.conversationId,
        message: input.messageId,
        channel: input.channel,
      },
    });
  });

  it('consumes a bounded SSE result without waiting for the server to close the stream', async () => {
    mode = 'sse';
    expect((await adapter().draftReply(draftInput())).status).toBe('READY');
  });

  it('returns manual/not-configured without traffic or cross-workspace fallback', async () => {
    expect(
      await adapter().draftReply({
        ...draftInput(),
        workspaceId: otherWorkspaceId,
      }),
    ).toEqual({
      mode: 'MANUAL',
      status: 'NOT_CONFIGURED',
      provider: 'HERMES_MCP',
    });
    expect(
      await new HermesMcpBotAdapter('{}').draftReply(draftInput()),
    ).toEqual({
      mode: 'MANUAL',
      status: 'NOT_CONFIGURED',
      provider: 'HERMES_MCP',
    });
    expect(requests).toHaveLength(0);
  });

  it('blocks loopback/private targets by default before any HTTP connection', async () => {
    expect(
      (await new HermesMcpBotAdapter(configuration()).draftReply(draftInput()))
        .status,
    ).toBe('UNAVAILABLE');
    expect(requests).toHaveLength(0);
  });

  it('does not follow redirects or forward credentials to another endpoint', async () => {
    mode = 'redirect';
    expect((await adapter().draftReply(draftInput())).status).toBe(
      'UNAVAILABLE',
    );
    expect(redirectedRequests).toBe(0);
  });

  it.each(['writable-tool', 'missing-tool', 'input-schema', 'version'])(
    'refuses %s before invoking any tool',
    async (scenario) => {
      mode = scenario;
      expect((await adapter().draftReply(draftInput())).status).toBe(
        'UNAVAILABLE',
      );
      expect(requests.some((request) => request.method === 'tools/call')).toBe(
        false,
      );
    },
  );

  it.each(['auth', 'wrong-id', 'oversize', 'tool-error', 'output-schema'])(
    'fails closed with no raw diagnostics for %s',
    async (scenario) => {
      mode = scenario;
      const result = await adapter().draftReply(draftInput());
      expect(result).toEqual({
        mode: 'MANUAL',
        status: 'UNAVAILABLE',
        provider: 'HERMES_MCP',
      });
      expect(JSON.stringify(result).includes(token)).toBe(false);
      expect(JSON.stringify(result).includes(endpoint)).toBe(false);
    },
  );

  it('bounds the whole exchange and returns manual/unavailable after timeout', async () => {
    mode = 'timeout';
    const started = Date.now();
    expect((await adapter(100).draftReply(draftInput())).status).toBe(
      'UNAVAILABLE',
    );
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('rejects invalid identities and hides server-only credentials from serialization', async () => {
    const instance = adapter();
    expect(JSON.stringify(instance).includes(token)).toBe(false);
    expect(
      (
        await instance.draftReply({
          ...draftInput(),
          workspaceId: 'external-workspace',
        })
      ).status,
    ).toBe('UNAVAILABLE');
    expect(requests).toHaveLength(0);
  });
});
