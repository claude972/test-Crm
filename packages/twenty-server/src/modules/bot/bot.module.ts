import { Module } from '@nestjs/common';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { McpClient } from 'src/modules/bot/drivers/mcp-client';
import { BotService } from 'src/modules/bot/services/bot.service';

@Module({
  imports: [MessagingModule, CalendarModule],
  providers: [McpClient, BotService],
  exports: [BotService],
})
export class BotModule {}
