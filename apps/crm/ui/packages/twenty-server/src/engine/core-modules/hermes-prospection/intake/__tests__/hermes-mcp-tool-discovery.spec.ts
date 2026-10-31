import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';

import { HermesMcpBotAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter';

// R09 — the callable tool set must be the runtime intersection of what the
// company's own MCP server advertises and what its operator explicitly
// granted. Nothing here is a hardcoded tool list, and this fixture is a
// demonstration MCP server on loopback, never a verified real connector.
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const token = randomBytes(32).toString('hex');
const draftTool = 'fixture_draft_reply';
const flatSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    thread: { type: 'string' },
    message: { type: 'string' },
    channel: { type: 'string' },
  },
  required: ['prompt'],
};
const nestedSchema = {
  type: 'object',
  properties: { prompt: { type: 'object', properties: {} } },
};
const advertised = [
  {
    name: draftTool,
    title: 'Rédiger une proposition de réponse',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: flatSchema,
  },
  {
    name: 'fixture_search_notes',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: flatSchema,
  },
  {
    name: 'fixture_send_message',
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: flatSchema,
  },
  {
    name: 'fixture_purge',
    annotations: { readOnlyHint: true, destructiveHint: true },
    inputSchema: flatSchema,
  },
  {
    name: 'fixture_nested',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: nestedSchema,
  },
  {
    name: 'fixture_twin',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: flatSchema,
  },
  {
    name: 'fixture_twin',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: flatSchema,
  },
];
// The operator grants four names. Two advertised tools are deliberately left
// ungranted, and two granted names are deliberately uncallable.
const granted = [draftTool, 'fixture_purge', 'fixture_nested', 'fixture_twin'];

describe('Hermes MCP tool discovery and authorization — isolated loopback', () => {
  let server: Server;
  let endpoint: string;
  let mode = 'normal';
  let deferredList: Promise<void> = Promise.resolve();
  let releaseDeferredList: () => void = () => undefined;
  const requests: { method: string; params?: Record<string, unknown> }[] = [];
  const configuration = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      [workspaceId]: {
        endpoint,
        token,
        toolName: draftTool,
        authorizedTools: granted,
        protocolVersion: '2025-11-25',
        argumentMap: {
          text: 'prompt',
          conversationId: 'thread',
          messageId: 'message',
          channel: 'channel',
        },
        ...overrides,
      },
    });
  const adapter = (
    overrides?: Record<string, unknown>,
    assertCurrent?: () => Promise<void>,
  ) =>
    new HermesMcpBotAdapter(configuration(overrides), {
      allowedInternalHosts: ['127.0.0.1'],
      timeoutMs: 1500,
      ...(assertCurrent ? { assertCurrent } : {}),
    });
  const byName = (
    tools: { name: string }[],
    name: string,
  ): Record<string, unknown> =>
    tools.find((tool) => tool.name === name) as unknown as Record<
      string,
      unknown
    >;

  beforeAll(async () => {
    jest.useRealTimers();
    server = createServer(async (request, response) => {
      let text = '';
      for await (const chunk of request) text += String(chunk);
      const body = JSON.parse(text) as {
        id?: string;
        method: string;
        params?: Record<string, unknown>;
      };
      requests.push({ method: body.method, params: body.params });
      if (request.headers.authorization !== `Bearer ${token}`) {
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
      if (body.method === 'initialize')
        result = {
          protocolVersion: '2025-11-25',
          capabilities: { tools: {} },
          serverInfo: { name: 'synthetic-mcp', version: '1.0.0' },
        };
      else if (body.method === 'tools/list') {
        if (mode === 'paged') {
          const cursor = body.params?.cursor;
          result = cursor
            ? { tools: [advertised[1]], nextCursor: `${String(cursor)}-next` }
            : { tools: [advertised[0]], nextCursor: 'page-2' };
        } else result = { tools: advertised };
        // Hold the final tools/list response open so a rotation can land
        // while it is in flight.
        if (mode === 'deferred-list') await deferredList;
      } else if (body.method === 'tools/call')
        result = { content: [{ type: 'text', text: 'Proposition rédigée' }] };
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    mode = 'normal';
    requests.length = 0;
    deferredList = new Promise<void>((resolve) => {
      releaseDeferredList = resolve;
    });
  });

  afterEach(() => {
    // Never leave the fixture server holding a response open.
    releaseDeferredList();
  });

  it('discovers the advertised tools and reports each authorization refusal without calling any tool', async () => {
    const result = await adapter().discoverTools({ workspaceId });

    expect(result.status).toBe('READY');
    expect(result.draftingTool).toBe(draftTool);
    expect(result.authorizedTools).toEqual(granted);
    expect(result.truncated).toBe(false);
    // Six distinct advertised names, the duplicate reported once.
    expect(result.tools.map((tool) => tool.name)).toEqual([
      draftTool,
      'fixture_search_notes',
      'fixture_send_message',
      'fixture_purge',
      'fixture_nested',
      'fixture_twin',
    ]);
    expect(byName(result.tools, draftTool)).toEqual({
      name: draftTool,
      title: 'Rédiger une proposition de réponse',
      authorized: true,
      callable: true,
      refusals: [],
      isDraftingTool: true,
    });
    // Advertised but never granted: discovered, reported, not callable.
    expect(byName(result.tools, 'fixture_search_notes')).toEqual({
      name: 'fixture_search_notes',
      title: null,
      authorized: false,
      callable: false,
      refusals: ['NOT_AUTHORIZED'],
      isDraftingTool: false,
    });
    expect(byName(result.tools, 'fixture_send_message')).toMatchObject({
      authorized: false,
      callable: false,
      refusals: ['NOT_AUTHORIZED', 'NOT_READ_ONLY'],
    });
    // Granted by the operator, yet still refused on the server's own hints
    // and on the auditable schema profile.
    expect(byName(result.tools, 'fixture_purge')).toMatchObject({
      authorized: true,
      callable: false,
      refusals: ['DESTRUCTIVE'],
    });
    expect(byName(result.tools, 'fixture_nested')).toMatchObject({
      authorized: true,
      callable: false,
      refusals: ['UNSUPPORTED_SCHEMA'],
    });
    expect(byName(result.tools, 'fixture_twin')).toMatchObject({
      authorized: true,
      callable: false,
      refusals: ['DUPLICATE_NAME'],
    });
    // Discovery is read-only: the lifecycle and tools/list, no tools/call.
    expect(requests.map((entry) => entry.method)).toEqual([
      'initialize',
      'notifications/initialized',
      'tools/list',
    ]);
  });

  it('reports an incomplete advertised set instead of treating three pages as the whole list', async () => {
    mode = 'paged';

    const result = await adapter().discoverTools({ workspaceId });

    expect(result.status).toBe('READY');
    expect(result.truncated).toBe(true);
    expect(
      requests.filter((entry) => entry.method === 'tools/list'),
    ).toHaveLength(3);
    expect(requests.some((entry) => entry.method === 'tools/call')).toBe(false);
  });

  it('never discovers another company tool surface and opens no connection for it', async () => {
    const result = await adapter().discoverTools({
      workspaceId: otherWorkspaceId,
    });

    expect(result).toEqual({
      status: 'NOT_CONFIGURED',
      provider: 'HERMES_MCP',
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    });
    expect(requests).toHaveLength(0);
  });

  it('refuses a configuration whose drafting tool holds no operator grant, before any request', async () => {
    const ungranted = { authorizedTools: ['fixture_search_notes'] };

    await expect(
      adapter(ungranted).discoverTools({ workspaceId }),
    ).resolves.toMatchObject({ status: 'UNAVAILABLE', tools: [] });
    await expect(
      adapter(ungranted).draftReply({
        workspaceId,
        conversationId: randomUUID(),
        messageId: randomUUID(),
        text: 'Question entrante de démonstration',
        channel: 'WHATSAPP',
      }),
    ).resolves.toEqual({
      mode: 'MANUAL',
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
    });
    expect(requests).toHaveLength(0);
  });

  it('refuses a grant list that repeats a name', async () => {
    await expect(
      adapter({ authorizedTools: [draftTool, draftTool] }).discoverTools({
        workspaceId,
      }),
    ).resolves.toMatchObject({ status: 'UNAVAILABLE' });
    expect(requests).toHaveLength(0);
  });

  it('calls only the granted drafting tool even though the grant covers several names', async () => {
    const result = await adapter().draftReply({
      workspaceId,
      conversationId: randomUUID(),
      messageId: randomUUID(),
      text: 'Question entrante de démonstration',
      channel: 'WHATSAPP',
    });

    expect(result).toEqual({
      mode: 'DRAFT',
      status: 'READY',
      provider: 'HERMES_MCP',
      text: 'Proposition rédigée',
    });
    const calls = requests.filter((entry) => entry.method === 'tools/call');
    expect(calls).toHaveLength(1);
    expect(calls[0].params?.name).toBe(draftTool);
  });

  // CJ-MCP-001 — the per-request guard runs before each POST, so the final
  // tools/list response had nothing behind it. A rotation landing while that
  // response is in flight must not publish the surface it described.
  it('refuses a stale tool surface when the connection rotates behind the last tools/list response', async () => {
    mode = 'deferred-list';
    let rotated = false;
    const assertCurrent = jest.fn(async () => {
      if (rotated) throw new Error('MCP_CONFIGURATION_CHANGED');
    });
    const pending = adapter(undefined, assertCurrent).discoverTools({
      workspaceId,
    });
    // Wait until the server is holding the tools/list response open, then
    // rotate the connection and let that response arrive.
    while (!requests.some((entry) => entry.method === 'tools/list'))
      await new Promise((resolve) => setTimeout(resolve, 10));
    rotated = true;
    releaseDeferredList();

    const result = await pending;

    // No stale surface and no stale grants survive the rotation.
    expect(result).toEqual({
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    });
    // The guard ran again after the complete collection, not only before the
    // POSTs, and discovery never invoked a tool.
    expect(assertCurrent.mock.calls.length).toBeGreaterThan(3);
    expect(requests.some((entry) => entry.method === 'tools/call')).toBe(false);
  });

  it('still publishes the surface when the connection is unchanged behind the last response', async () => {
    mode = 'deferred-list';
    const assertCurrent = jest.fn(async () => undefined);
    const pending = adapter(undefined, assertCurrent).discoverTools({
      workspaceId,
    });
    while (!requests.some((entry) => entry.method === 'tools/list'))
      await new Promise((resolve) => setTimeout(resolve, 10));
    releaseDeferredList();

    const result = await pending;

    expect(result.status).toBe('READY');
    expect(result.authorizedTools).toEqual(granted);
    expect(byName(result.tools, draftTool)).toMatchObject({ callable: true });
  });

  it('keeps an absent grant list meaning exactly the drafting tool', async () => {
    const result = await adapter({ authorizedTools: undefined }).discoverTools({
      workspaceId,
    });

    expect(result.authorizedTools).toEqual([draftTool]);
    expect(byName(result.tools, draftTool)).toMatchObject({
      authorized: true,
      callable: true,
    });
    // Previously granted names lose their grant when the list is absent.
    expect(byName(result.tools, 'fixture_purge')).toMatchObject({
      authorized: false,
      refusals: ['NOT_AUTHORIZED', 'DESTRUCTIVE'],
    });
  });
});
