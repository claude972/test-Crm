import { Module } from '@nestjs/common';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { BotModule } from 'src/modules/bot/bot.module';
import { FormsModule } from 'src/modules/forms/forms.module';

@Module({
  imports: [
    MessagingModule,
    CalendarModule,
    BotModule,
    FormsModule,
  ],
})
export class ModulesModule {}
