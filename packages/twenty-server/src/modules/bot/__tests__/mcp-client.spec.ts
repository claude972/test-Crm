/** @jest-environment node */
import { McpClient } from '../drivers/mcp-client';

describe('McpClient', () => {
  let client: McpClient;

  beforeEach(() => {
    client = new McpClient({
      url: 'http://localhost:8080',
      timeout: 5000,
    });
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  describe('callTool', () => {
    it('should call tool successfully', async () => {
      // Mock fetch
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          result: { success: true, data: { id: '1' } },
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse as any);

      const result = await client.callTool('search_lead', { query: 'test' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/mcp/call',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network Error'));

      await expect(
        client.callTool('fail', {})
      ).rejects.toThrow('Network Error');
    });
  });

  describe('listTools', () => {
    it('should list tools', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          result: {
            tools: [
              { name: 'tool1' },
              { name: 'tool2' },
            ],
          },
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse as any);

      const tools = await client.listTools();
      expect(tools).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Error'));

      const tools = await client.listTools();
      expect(tools).toEqual([]);
    });
  });
});
