import { Injectable, Logger } from '@nestjs/common';
import { type McpClientConfig } from 'src/modules/bot/types/mcp-client-config.type';

/**
 * MCP HTTP client for communicating with the MCP bot server.
 * Handles tool calls via JSON-RPC 2.0 over HTTP.
 */
@Injectable()
export class McpClient {
  private readonly logger = new Logger(McpClient.name);

  private config: McpClientConfig;

  constructor(config?: McpClientConfig) {
    this.config = config || {
      url: process.env.MCP_BOT_SERVER_URL || 'http://localhost:8080',
      timeout: 30000,
      apiKey: process.env.MCP_BOT_API_KEY,
    };
  }

  /**
   * Call an MCP tool by name with given arguments.
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const url = `${this.config.url}/mcp/call`;
    const payload = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
      id: Date.now(),
    };

    this.logger.debug(`Calling MCP tool: ${name}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { 'Authorization': `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `MCP call failed: ${response.status} - ${errorText}`,
        );
        throw new Error(`MCP call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      this.logger.error(`MCP call error for ${name}: ${error}`);
      throw error;
    }
  }

  /**
   * List available tools from the MCP server.
   */
  async listTools(): Promise<[]> {
    const url = `${this.config.url}/mcp/tools`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.config.apiKey
          ? { 'Authorization': `Bearer ${this.config.apiKey}` }
          : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const result = await response.json();
      return result.result?.tools ?? [];
    } catch (error) {
      this.logger.warn(`Could not list MCP tools: ${error}`);
      return [];
    }
  }
}
