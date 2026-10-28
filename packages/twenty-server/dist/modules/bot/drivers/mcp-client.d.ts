import { type McpClientConfig } from 'src/modules/bot/types/mcp-client-config.type';
/**
 * MCP HTTP client for communicating with the MCP bot server.
 * Handles tool calls via JSON-RPC 2.0 over HTTP.
 */
export declare class McpClient {
    private readonly logger;
    private config;
    constructor(config?: McpClientConfig);
    /**
     * Call an MCP tool by name with given arguments.
     */
    callTool(name: string, args: Record<string, any>): Promise<any>;
    /**
     * List available tools from the MCP server.
     */
    listTools(): Promise<[]>;
}
