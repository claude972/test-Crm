import { Injectable } from '@nestjs/common';

import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesMcpBotAdapter } from './hermes-mcp-bot.adapter';
import {
  type HermesMcpDraftInput,
  type HermesMcpDraftResult,
} from './hermes-mcp.schema';

@Injectable()
export class HermesConnectedMcpAdapter {
  constructor(private readonly connections: HermesConnectionsService) {}
  async draftReply(input: HermesMcpDraftInput): Promise<HermesMcpDraftResult> {
    try {
      const snapshot = await this.connections.resolve(input.workspaceId, 'MCP');
      if (!snapshot)
        return {
          mode: 'MANUAL',
          status: 'NOT_CONFIGURED',
          provider: 'HERMES_MCP',
        };
      const assertCurrent = async () => {
        const current = await this.connections.resolve(
          input.workspaceId,
          'MCP',
        );
        if (
          !current ||
          current.connectionId !== snapshot.connectionId ||
          current.revision !== snapshot.revision
        )
          throw new Error('MCP_CONFIGURATION_CHANGED');
      };
      return await new HermesMcpBotAdapter(
        JSON.stringify({
          [input.workspaceId]: {
            ...snapshot.settings,
            token: snapshot.secrets.token,
          },
        }),
        { assertCurrent },
      ).draftReply(input);
    } catch {
      return { mode: 'MANUAL', status: 'UNAVAILABLE', provider: 'HERMES_MCP' };
    }
  }
}
