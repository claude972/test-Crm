import { Injectable, Logger } from '@nestjs/common';

import { ConversationService } from 'src/modules/messaging/conversation.service';
import { CalendarRdvService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service';
import { type SearchLeadInput, type SearchDealInput, type SendMessageInput, type ScheduleRdvInput } from 'src/modules/bot/types/bot-inputs.types';
import { type SearchResult, type SendMessageResult, type ScheduleRdvResult } from 'src/modules/bot/types/bot-results.types';
import { McpClient } from 'src/modules/bot/drivers/mcp-client';

/**
 * Bot service — orchestrate MCP tool calls with internal CRM modules.
 *
 * Search operations delegate to MCP server tools.
 * Messaging delegates to the Boîte (messaging) module.
 * Calendar delegates to the Calendrier (calendar) module.
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly mcpClient: McpClient,
    private readonly conversationService: ConversationService,
    private readonly calendarRdvService: CalendarRdvService,
  ) {}

  /**
   * Search for leads using the MCP bot search tool.
   */
  async searchLead(input: SearchLeadInput, workspaceId: string): Promise<SearchResult> {
    this.logger.debug(`Bot: searching leads for workspace ${workspaceId}`);

    try {
      const result = await this.mcpClient.callTool('search_lead', {
        query: input.query,
        filters: input.filters,
        limit: input.limit ?? 20,
        workspaceId,
      });

      return {
        results: result?.results ?? [],
        total: result?.total ?? 0,
        hasMore: result?.hasMore ?? false,
      };
    } catch (error) {
      this.logger.error(`MCP lead search failed: ${error}`);
      throw error;
    }
  }

  /**
   * Search for deals using the MCP bot search tool.
   */
  async searchDeal(input: SearchDealInput, workspaceId: string): Promise<SearchResult> {
    this.logger.debug(`Bot: searching deals for workspace ${workspaceId}`);

    try {
      const result = await this.mcpClient.callTool('search_deal', {
        query: input.query,
        filters: input.filters,
        limit: input.limit ?? 20,
        workspaceId,
      });

      return {
        results: result?.results ?? [],
        total: result?.total ?? 0,
        hasMore: result?.hasMore ?? false,
      };
    } catch (error) {
      this.logger.error(`MCP deal search failed: ${error}`);
      throw error;
    }
  }

  /**
   * Send a message via the Boîte (messaging) module.
   */
  async sendMessage(input: SendMessageInput, workspaceId: string): Promise<SendMessageResult> {
    this.logger.debug(`Bot: sending message via Boîte module for workspace ${workspaceId}`);

    try {
      // Delegate to the ConversationService (Boîte module)
      await this.conversationService.sendOnChannel(
        input.recipient,
        input.channel ?? 'EMAIL',
        input.message,
      );

      return { success: true, messageId: `msg-${Date.now()}` };
    } catch (error: unknown) {
      this.logger.error(`Failed to send message via Boîte: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Boîte module error: ${errorMessage}` };
    }
  }

  /**
   * Schedule an RDV via the Calendrier (calendar) module.
   */
  async scheduleRDV(input: ScheduleRdvInput, workspaceId: string): Promise<ScheduleRdvResult> {
    this.logger.debug(`Bot: scheduling RDV via Calendrier module for workspace ${workspaceId}`);

    try {
      // Delegate to CalendarRdvService (Calendrier module)
      await this.calendarRdvService.createRDV({
        ...input,
        workspaceId,
      });

      return { success: true, eventId: `rdv-${Date.now()}` };
    } catch (error: unknown) {
      this.logger.error(`Failed to schedule RDV via Calendrier: ${error}`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Calendrier module error: ${errorMessage}` };
    }
  }

  /**
   * List available MCP tools (health/diagnostic).
   */
  async getAvailableTools(): Promise<[]> {
    return this.mcpClient.listTools();
  }
}
