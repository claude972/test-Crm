import { type HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesConnectedMcpAdapter } from '../mcp/hermes-connected-mcp.adapter';
import { HermesMcpBotAdapter } from '../mcp/hermes-mcp-bot.adapter';

jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock('../mcp/hermes-mcp-bot.adapter', () => ({
  HermesMcpBotAdapter: jest
    .fn()
    .mockImplementation(
      (
        _serialized: string,
        options: { assertCurrent: () => Promise<void> },
      ) => ({
        draftReply: async () => {
          await options.assertCurrent();
          return {
            mode: 'DRAFT',
            status: 'READY',
            provider: 'HERMES_MCP',
            text: 'Synthetic draft',
          };
        },
      }),
    ),
}));
const input = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
  messageId: '00000000-0000-4000-8000-000000000003',
  text: 'Synthetic only',
  channel: 'WHATSAPP' as const,
};
const snapshot = {
  connectionId: '00000000-0000-4000-8000-000000000004',
  revision: 1,
  settings: {
    endpoint: 'https://mcp.example.com',
    toolName: 'draft',
    argumentMap: { text: 'text' },
    protocolVersion: '2025-11-25',
  },
  secrets: { token: 't'.repeat(32) },
};
describe('authoritative dynamic MCP binding', () => {
  beforeEach(() => jest.clearAllMocks());
  it('returns NOT_CONFIGURED without constructing a provider or using environment fallback', async () => {
    const reader = { resolve: jest.fn(async () => null) };
    expect(
      await new HermesConnectedMcpAdapter(
        reader as unknown as HermesConnectionsService,
      ).draftReply(input),
    ).toMatchObject({ status: 'NOT_CONFIGURED', mode: 'MANUAL' });
    expect(HermesMcpBotAdapter).not.toHaveBeenCalled();
  });
  it('never returns READY when configuration is revoked or rotated before native RPC guards', async () => {
    const reader = {
      resolve: jest
        .fn()
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce({ ...snapshot, revision: 2 }),
    };
    expect(
      await new HermesConnectedMcpAdapter(
        reader as unknown as HermesConnectionsService,
      ).draftReply(input),
    ).toMatchObject({ status: 'UNAVAILABLE', mode: 'MANUAL' });
  });
  it('reloads tokens on later calls and does not cache READY across revocation', async () => {
    let current: typeof snapshot | null = snapshot;
    const reader = { resolve: jest.fn(async () => current) };
    const adapter = new HermesConnectedMcpAdapter(
      reader as unknown as HermesConnectionsService,
    );
    expect((await adapter.draftReply(input)).status).toBe('READY');
    current = { ...snapshot, revision: 2, secrets: { token: 'r'.repeat(32) } };
    await adapter.draftReply(input);
    expect(
      JSON.parse(jest.mocked(HermesMcpBotAdapter).mock.calls[1][0])[
        input.workspaceId
      ].token,
    ).toBe('r'.repeat(32));
    current = null;
    expect((await adapter.draftReply(input)).status).toBe('NOT_CONFIGURED');
    expect(HermesMcpBotAdapter).toHaveBeenCalledTimes(2);
  });
});
