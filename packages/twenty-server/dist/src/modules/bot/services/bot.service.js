"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const conversation_service_1 = require("src/modules/messaging/conversation.service");
const calendar_rdv_service_1 = require("src/modules/calendar/calendar-event-creation-manager/services/calendar-rdv.service");
const mcp_client_1 = require("src/modules/bot/drivers/mcp-client");
/**
 * Bot service — orchestrate MCP tool calls with internal CRM modules.
 *
 * Search operations delegate to MCP server tools.
 * Messaging delegates to the Boîte (messaging) module.
 * Calendar delegates to the Calendrier (calendar) module.
 */
let BotService = BotService_1 = class BotService {
    mcpClient;
    conversationService;
    calendarRdvService;
    logger = new common_1.Logger(BotService_1.name);
    constructor(mcpClient, conversationService, calendarRdvService) {
        this.mcpClient = mcpClient;
        this.conversationService = conversationService;
        this.calendarRdvService = calendarRdvService;
    }
    /**
     * Search for leads using the MCP bot search tool.
     */
    async searchLead(input, workspaceId) {
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
        }
        catch (error) {
            this.logger.error(`MCP lead search failed: ${error}`);
            throw error;
        }
    }
    /**
     * Search for deals using the MCP bot search tool.
     */
    async searchDeal(input, workspaceId) {
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
        }
        catch (error) {
            this.logger.error(`MCP deal search failed: ${error}`);
            throw error;
        }
    }
    /**
     * Send a message via the Boîte (messaging) module.
     */
    async sendMessage(input, workspaceId) {
        this.logger.debug(`Bot: sending message via Boîte module for workspace ${workspaceId}`);
        try {
            // Delegate to the ConversationService (Boîte module)
            await this.conversationService.sendOnChannel(input.recipient, input.channel ?? 'EMAIL', input.message);
            return { success: true, messageId: `msg-${Date.now()}` };
        }
        catch (error) {
            this.logger.error(`Failed to send message via Boîte: ${error}`);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Boîte module error: ${errorMessage}` };
        }
    }
    /**
     * Schedule an RDV via the Calendrier (calendar) module.
     */
    async scheduleRDV(input, workspaceId) {
        this.logger.debug(`Bot: scheduling RDV via Calendrier module for workspace ${workspaceId}`);
        try {
            // Delegate to CalendarRdvService (Calendrier module)
            await this.calendarRdvService.createRDV({
                ...input,
                workspaceId,
            });
            return { success: true, eventId: `rdv-${Date.now()}` };
        }
        catch (error) {
            this.logger.error(`Failed to schedule RDV via Calendrier: ${error}`);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Calendrier module error: ${errorMessage}` };
        }
    }
    /**
     * List available MCP tools (health/diagnostic).
     */
    async getAvailableTools() {
        return this.mcpClient.listTools();
    }
};
exports.BotService = BotService;
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mcp_client_1.McpClient,
        conversation_service_1.ConversationService,
        calendar_rdv_service_1.CalendarRdvService])
], BotService);
