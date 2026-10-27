/** @jest-environment node */
import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from '../services/bot.service';
import { McpClient } from '../drivers/mcp-client';
import { ConversationService } from '../../messaging/conversation.service';
import { CalendarRdvService } from '../../calendar/calendar-event-creation-manager/services/calendar-rdv.service';

describe('BotService', () => {
  let service: BotService;
  let mcpClient: jest.Mocked<McpClient>;
  let conversationService: jest.Mocked<ConversationService>;
  let calendarRdvService: jest.Mocked<CalendarRdvService>;

  beforeEach(async () => {
    mcpClient = {
      callTool: jest.fn(),
      listTools: jest.fn().mockResolvedValue([
        { name: 'search_lead', description: 'Search leads' },
        { name: 'search_deal', description: 'Search deals' },
      ]),
    } as any;
    conversationService = {
      sendOnChannel: jest.fn().mockResolvedValue(true),
    } as any;
    calendarRdvService = {
      createRDV: jest.fn().mockResolvedValue({ id: 'rdv-123' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: McpClient, useValue: mcpClient },
        { provide: ConversationService, useValue: conversationService },
        { provide: CalendarRdvService, useValue: calendarRdvService },
      ],
    }).compile();

    service = module.get(BotService);
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

      const result = await service.searchLead(
        { query: 'test lead' },
        'workspace-1'
      );

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mcpClient.callTool).toHaveBeenCalledWith('search_lead', expect.objectContaining({
        query: 'test lead',
        workspaceId: 'workspace-1',
      }));
    });

    it('should handle MCP errors', async () => {
      mcpClient.callTool.mockRejectedValue(new Error('MCP Error'));

      await expect(
        service.searchLead({ query: 'fail' }, 'workspace-1')
      ).rejects.toThrow('MCP Error');
    });
  });

  describe('sendMessage', () => {
    it('should send message via Boîte module', async () => {
      const result = await service.sendMessage(
        {
          recipient: 'test@example.com',
          message: 'Hello',
          channel: 'EMAIL',
        },
        'workspace-1'
      );

      expect(result.success).toBe(true);
      expect(conversationService.sendOnChannel).toHaveBeenCalled();
    });

    it('should return error when Boîte fails', async () => {
      conversationService.sendOnChannel.mockRejectedValue(
        new Error('Boîte Error')
      );

      const result = await service.sendMessage(
        {
          recipient: 'test@example.com',
          message: 'Hello',
        },
        'workspace-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Boîte');
    });
  });

  describe('scheduleRDV', () => {
    it('should schedule RDV via Calendrier module', async () => {
      const result = await service.scheduleRDV(
        {
          title: 'Test RDV',
          start: '2024-12-01T10:00:00Z',
          end: '2024-12-01T11:00:00Z',
          attendees: [],
        },
        'workspace-1'
      );

      expect(result.success).toBe(true);
      expect(calendarRdvService.createRDV).toHaveBeenCalled();
    });

    it('should return error when Calendrier fails', async () => {
      (calendarRdvService.createRDV as any).mockRejectedValue(
        new Error('Calendar Error')
      );

      const result = await service.scheduleRDV(
        {
          title: 'Test RDV',
          start: '2024-12-01T10:00:00Z',
          end: '2024-12-01T11:00:00Z',
          attendees: [],
        },
        'workspace-1'
      );

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
