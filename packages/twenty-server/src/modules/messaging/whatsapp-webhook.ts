import { Controller, Post, Body, Param, Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Injectable()
export class WhatsAppWebhookDriver {}

@Controller('webhooks/messaging/whatsapp')
export class WhatsAppWebhookController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('inbound')
  async inbound(
    @Param('externalChannelId') externalChannelId: string,
    @Body() body: { messageThreadId?: string; channelType?: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT'; text?: string },
  ) {
    return { externalChannelId, received: body, at: new Date().toISOString() };
  }
}
