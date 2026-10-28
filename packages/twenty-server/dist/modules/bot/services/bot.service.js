"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Bot service — orchestrate MCP tool calls with internal CRM modules.
 *
 * Search operations delegate to MCP server tools.
 * Messaging delegates to the Boîte (messaging) module.
 * Calendar delegates to the Calendrier (calendar) module.
 */
let BotService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BotService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BotService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        mcpClient;
        conversationService;
        calendarRdvService;
        logger = new common_1.Logger(BotService.name);
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
    return BotService = _classThis;
})();
exports.BotService = BotService;
