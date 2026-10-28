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
export declare class BotService {
    private readonly mcpClient;
    private readonly conversationService;
    private readonly calendarRdvService;
    private readonly logger;
    constructor(mcpClient: McpClient, conversationService: ConversationService, calendarRdvService: CalendarRdvService);
    /**
     * Search for leads using the MCP bot search tool.
     */
    searchLead(input: SearchLeadInput, workspaceId: string): Promise<SearchResult>;
    /**
     * Search for deals using the MCP bot search tool.
     */
    searchDeal(input: SearchDealInput, workspaceId: string): Promise<SearchResult>;
    /**
     * Send a message via the Boîte (messaging) module.
     */
    sendMessage(input: SendMessageInput, workspaceId: string): Promise<SendMessageResult>;
    /**
     * Schedule an RDV via the Calendrier (calendar) module.
     */
    scheduleRDV(input: ScheduleRdvInput, workspaceId: string): Promise<ScheduleRdvResult>;
    /**
     * List available MCP tools (health/diagnostic).
     */
    getAvailableTools(): Promise<[]>;
}
