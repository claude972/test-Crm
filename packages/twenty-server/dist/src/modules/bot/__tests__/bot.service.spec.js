"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @jest-environment node */
const testing_1 = require("@nestjs/testing");
const bot_service_1 = require("../services/bot.service");
const mcp_client_1 = require("../drivers/mcp-client");
const conversation_service_1 = require("../../messaging/conversation.service");
const calendar_rdv_service_1 = require("../../calendar/calendar-event-creation-manager/services/calendar-rdv.service");
describe('BotService', () => {
    let service;
    let mcpClient;
    let conversationService;
    let calendarRdvService;
    beforeEach(async () => {
        mcpClient = {
            callTool: jest.fn(),
            listTools: jest.fn().mockResolvedValue([
                { name: 'search_lead', description: 'Search leads' },
                { name: 'search_deal', description: 'Search deals' },
            ]),
        };
        conversationService = {
            sendOnChannel: jest.fn().mockResolvedValue(true),
        };
        calendarRdvService = {
            createRDV: jest.fn().mockResolvedValue({ id: 'rdv-123' }),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                bot_service_1.BotService,
                { provide: mcp_client_1.McpClient, useValue: mcpClient },
                { provide: conversation_service_1.ConversationService, useValue: conversationService },
                { provide: calendar_rdv_service_1.CalendarRdvService, useValue: calendarRdvService },
            ],
        }).compile();
        service = module.get(bot_service_1.BotService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('searchLead', () => {
        it('should search leads via MCP', async () => {
            mcpClient.callTool.mockResolvedValue({
                results: [{ id: '1', name: 'Test Lead' }],
                total: 1,
                hasMore: false,
            });
            const result = await service.searchLead({ query: 'test lead' }, 'workspace-1');
            expect(result.results).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(mcpClient.callTool).toHaveBeenCalledWith('search_lead', expect.objectContaining({
                query: 'test lead',
                workspaceId: 'workspace-1',
            }));
        });
        it('should handle MCP errors', async () => {
            mcpClient.callTool.mockRejectedValue(new Error('MCP Error'));
            await expect(service.searchLead({ query: 'fail' }, 'workspace-1')).rejects.toThrow('MCP Error');
        });
    });
    describe('sendMessage', () => {
        it('should send message via Boîte module', async () => {
            const result = await service.sendMessage({
                recipient: 'test@example.com',
                message: 'Hello',
                channel: 'EMAIL',
            }, 'workspace-1');
            expect(result.success).toBe(true);
            expect(conversationService.sendOnChannel).toHaveBeenCalled();
        });
        it('should return error when Boîte fails', async () => {
            conversationService.sendOnChannel.mockRejectedValue(new Error('Boîte Error'));
            const result = await service.sendMessage({
                recipient: 'test@example.com',
                message: 'Hello',
            }, 'workspace-1');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Boîte');
        });
    });
    describe('scheduleRDV', () => {
        it('should schedule RDV via Calendrier module', async () => {
            const result = await service.scheduleRDV({
                title: 'Test RDV',
                start: '2024-12-01T10:00:00Z',
                end: '2024-12-01T11:00:00Z',
                attendees: [],
            }, 'workspace-1');
            expect(result.success).toBe(true);
            expect(calendarRdvService.createRDV).toHaveBeenCalled();
        });
        it('should return error when Calendrier fails', async () => {
            calendarRdvService.createRDV.mockRejectedValue(new Error('Calendar Error'));
            const result = await service.scheduleRDV({
                title: 'Test RDV',
                start: '2024-12-01T10:00:00Z',
                end: '2024-12-01T11:00:00Z',
                attendees: [],
            }, 'workspace-1');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Calendrier');
        });
    });
    describe('getAvailableTools', () => {
        it('should list MCP tools', async () => {
            const tools = await service.getAvailableTools();
            expect(tools).toHaveLength(2);
        });
    });
});
