import { Controller, Post, Body, Param, Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Injectable()
export class WebchatWebhookDriver {}

@Controller('webhooks/messaging/webchat')
export class WebchatWebhookController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('inbound')
  async inbound(
    @Param('externalChannelId') externalChannelId: string,
    @Body() body: { messageThreadId?: string; channelType?: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT'; text?: string },
  ) {
    return { externalChannelId, received: body, at: new Date().toISOString() };
  }
}
