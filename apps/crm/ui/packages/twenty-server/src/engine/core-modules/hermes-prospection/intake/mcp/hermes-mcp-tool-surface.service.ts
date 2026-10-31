import { Injectable, Optional } from '@nestjs/common';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { type HermesProspectionActor } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { HermesConnectedMcpAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-connected-mcp.adapter';
import { HermesMcpBotAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-bot.adapter';
import { type HermesMcpToolSurface } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.dto';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class HermesMcpToolSurfaceService {
  // When the stored-connection adapter is available it is authoritative, so
  // discovery reads the same connection the bot itself would use. The private
  // configuration map is the fallback for a deployment without it.
  constructor(
    private readonly access: HermesProspectionAccessService,
    private readonly config: KovaaLabCRMConfigService,
    @Optional() private readonly connected?: HermesConnectedMcpAdapter,
  ) {}

  // Reads what the authorized company's own MCP server advertises, and which
  // of those tools its operator granted. Discovery performs no tools/call, so
  // this reports an offer, not a verified working connector. No endpoint,
  // credential or operator identity is returned to the browser.
  async read(actor: HermesProspectionActor): Promise<HermesMcpToolSurface> {
    await this.access.assertAllowed(actor);
    const checkedAt = new Date().toISOString();
    const empty = {
      checkedAt,
      authorizedTools: [],
      draftingTool: null,
      tools: [],
      truncated: false,
    };
    let discovery;
    try {
      discovery = this.connected
        ? await this.connected.discoverTools({ workspaceId: actor.workspaceId })
        : await new HermesMcpBotAdapter(
            this.config.get('HERMES_MCP_CONNECTIONS'),
          ).discoverTools({ workspaceId: actor.workspaceId });
    } catch {
      return {
        status: 'CONFIGURATION_ERROR',
        errorCode: 'HERMES_MCP_CONFIGURATION_UNAVAILABLE',
        ...empty,
      };
    }
    // The authorization is rechecked after the exchange: a role revoked while
    // the server was answering must not deliver its tool list.
    await this.access.assertAllowed(actor);
    if (discovery.status === 'NOT_CONFIGURED')
      return { status: 'NOT_CONFIGURED', errorCode: null, ...empty };
    if (discovery.status === 'UNAVAILABLE')
      return {
        status: 'UNAVAILABLE',
        errorCode: 'HERMES_MCP_DISCOVERY_UNAVAILABLE',
        ...empty,
      };
    return {
      status: 'READY',
      checkedAt,
      errorCode: null,
      authorizedTools: discovery.authorizedTools,
      draftingTool: discovery.draftingTool,
      truncated: discovery.truncated,
      tools: discovery.tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        authorized: tool.authorized,
        callable: tool.callable,
        refusals: [...tool.refusals],
        isDraftingTool: tool.isDraftingTool,
      })),
    };
  }
}
