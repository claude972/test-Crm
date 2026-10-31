import { ForbiddenException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import { HermesMcpToolSurfaceService } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);

// R09 — only the authenticated administrator of a company may read what that
// company's MCP server advertises. The transport, SSRF boundary and real
// `tools/list` exchange are proven against the loopback demonstration server
// in hermes-mcp-tool-discovery.spec.ts and hermes-mcp-bot.adapter.spec.ts;
// this suite covers the authorization, shaping and non-disclosure the service
// itself owns.
const A = randomUUID();
const B = randomUUID();
const token = randomBytes(32).toString('hex');
const draftTool = 'fixture_draft_reply';
const actor = {
  workspaceId: A,
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const discovered = {
  status: 'READY' as const,
  provider: 'HERMES_MCP' as const,
  authorizedTools: [draftTool],
  draftingTool: draftTool,
  truncated: false,
  tools: [
    {
      name: draftTool,
      title: 'Rédiger une proposition de réponse',
      authorized: true,
      callable: true,
      refusals: [],
      isDraftingTool: true,
    },
    {
      name: 'fixture_send_message',
      title: null,
      authorized: false,
      callable: false,
      refusals: ['NOT_AUTHORIZED' as const, 'NOT_READ_ONLY' as const],
      isDraftingTool: false,
    },
  ],
};

describe('Hermes MCP tool surface — authorized company read', () => {
  let access: { assertAllowed: jest.Mock };
  let config: { get: jest.Mock };
  let connected: { discoverTools: jest.Mock };
  let surface: HermesMcpToolSurfaceService;

  beforeEach(() => {
    access = { assertAllowed: jest.fn(async () => undefined) };
    config = { get: jest.fn(() => '{}') };
    connected = { discoverTools: jest.fn(async () => discovered) };
    surface = new HermesMcpToolSurfaceService(
      access as never,
      config as never,
      connected as never,
    );
  });

  it('refuses a revoked administrator before any discovery exchange', async () => {
    access.assertAllowed.mockRejectedValue(new ForbiddenException());

    await expect(surface.read(actor)).rejects.toThrow(ForbiddenException);
    expect(connected.discoverTools).not.toHaveBeenCalled();
    expect(config.get).not.toHaveBeenCalled();
  });

  it('refuses an administrator revoked while the server was answering', async () => {
    access.assertAllowed
      .mockImplementationOnce(async () => undefined)
      .mockRejectedValueOnce(new ForbiddenException());

    await expect(surface.read(actor)).rejects.toThrow(ForbiddenException);
    expect(connected.discoverTools).toHaveBeenCalledTimes(1);
  });

  it('discovers for the session company only and never for a caller-named one', async () => {
    await surface.read(actor);

    expect(connected.discoverTools).toHaveBeenCalledWith({ workspaceId: A });
    expect(JSON.stringify(connected.discoverTools.mock.calls)).not.toContain(B);
  });

  it('reports the discovered tools with their grant and discloses no credential', async () => {
    const result = await surface.read(actor);

    expect(result.status).toBe('READY');
    expect(result.draftingTool).toBe(draftTool);
    expect(result.authorizedTools).toEqual([draftTool]);
    expect(result.truncated).toBe(false);
    expect(result.errorCode).toBeNull();
    expect(result.tools).toEqual([
      {
        name: draftTool,
        title: 'Rédiger une proposition de réponse',
        authorized: true,
        callable: true,
        refusals: [],
        isDraftingTool: true,
      },
      {
        name: 'fixture_send_message',
        title: null,
        authorized: false,
        callable: false,
        refusals: ['NOT_AUTHORIZED', 'NOT_READ_ONLY'],
        isDraftingTool: false,
      },
    ]);
    const output = JSON.stringify(result);
    expect(output).not.toContain(token);
    expect(output).not.toContain(actor.userId);
    expect(output).not.toContain(actor.userWorkspaceId);
  });

  it('reports NOT_CONFIGURED without inventing an authorized tool', async () => {
    connected.discoverTools.mockResolvedValue({
      status: 'NOT_CONFIGURED',
      provider: 'HERMES_MCP',
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    });

    await expect(surface.read(actor)).resolves.toMatchObject({
      status: 'NOT_CONFIGURED',
      errorCode: null,
      authorizedTools: [],
      draftingTool: null,
      tools: [],
    });
  });

  it('reports an unavailable discovery with no provider diagnostic', async () => {
    connected.discoverTools.mockResolvedValue({
      status: 'UNAVAILABLE',
      provider: 'HERMES_MCP',
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    });

    await expect(surface.read(actor)).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'HERMES_MCP_DISCOVERY_UNAVAILABLE',
      tools: [],
      draftingTool: null,
    });
  });

  it('reports a truncated advertised list rather than claiming it is whole', async () => {
    connected.discoverTools.mockResolvedValue({ ...discovered, truncated: true });

    await expect(surface.read(actor)).resolves.toMatchObject({
      status: 'READY',
      truncated: true,
    });
  });

  it('reports a configuration error without raw values when the private map is unreadable', async () => {
    surface = new HermesMcpToolSurfaceService(access as never, {
      get: jest.fn(() => {
        throw new Error('unreadable secret store');
      }),
    } as never);

    const result = await surface.read(actor);

    expect(result).toMatchObject({
      status: 'CONFIGURATION_ERROR',
      errorCode: 'HERMES_MCP_CONFIGURATION_UNAVAILABLE',
      tools: [],
      authorizedTools: [],
    });
    expect(JSON.stringify(result)).not.toContain('unreadable secret store');
  });

  it('falls back to the private configuration map when no stored connection adapter is wired', async () => {
    surface = new HermesMcpToolSurfaceService(access as never, {
      get: jest.fn(() => '{}'),
    } as never);

    // An empty map is a company without an MCP mapping, not an error.
    await expect(surface.read(actor)).resolves.toMatchObject({
      status: 'NOT_CONFIGURED',
      errorCode: null,
    });
  });
});
