import { Injectable } from '@nestjs/common';

import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesMcpBotAdapter } from './hermes-mcp-bot.adapter';
import {
  type HermesMcpDiscoveryResult,
  type HermesMcpDraftInput,
  type HermesMcpDraftResult,
} from './hermes-mcp.schema';

@Injectable()
export class HermesConnectedMcpAdapter {
  constructor(private readonly connections: HermesConnectionsService) {}

  // Builds a single-company client from the stored connection of that company
  // only, and a guard that refuses the exchange as soon as the stored
  // connection or its revision moves under it.
  private async client(workspaceId: string) {
    const snapshot = await this.connections.resolve(workspaceId, 'MCP');
    if (!snapshot) return null;
    const assertCurrent = async () => {
      const current = await this.connections.resolve(workspaceId, 'MCP');
      if (
        !current ||
        current.connectionId !== snapshot.connectionId ||
        current.revision !== snapshot.revision
      )
        throw new Error('MCP_CONFIGURATION_CHANGED');
    };
    return new HermesMcpBotAdapter(
      JSON.stringify({
        [workspaceId]: {
          ...snapshot.settings,
          token: snapshot.secrets.token,
        },
      }),
      { assertCurrent },
    );
  }

  async draftReply(input: HermesMcpDraftInput): Promise<HermesMcpDraftResult> {
    try {
      const client = await this.client(input.workspaceId);
      if (!client)
        return {
          mode: 'MANUAL',
          status: 'NOT_CONFIGURED',
          provider: 'HERMES_MCP',
        };
      return await client.draftReply(input);
    } catch {
      return { mode: 'MANUAL', status: 'UNAVAILABLE', provider: 'HERMES_MCP' };
    }
  }

  // Lists the tools the company's configured server actually advertises and
  // which of them the operator has granted. It performs no `tools/call`, so it
  // is not a proof that the drafting tool works, only of what is offered.
  async discoverTools(input: {
    workspaceId: string;
  }): Promise<HermesMcpDiscoveryResult> {
    const empty = {
      provider: 'HERMES_MCP' as const,
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    };
    try {
      const client = await this.client(input.workspaceId);
      if (!client) return { status: 'NOT_CONFIGURED', ...empty };
      return await client.discoverTools(input);
    } catch {
      return { status: 'UNAVAILABLE', ...empty };
    }
  }
}
