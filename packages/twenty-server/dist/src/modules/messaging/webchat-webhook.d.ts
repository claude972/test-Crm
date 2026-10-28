import { ConversationService } from './conversation.service';
export declare class WebchatWebhookDriver {
}
export declare class WebchatWebhookController {
    private readonly conversationService;
    constructor(conversationService: ConversationService);
    inbound(externalChannelId: string, body: {
        messageThreadId?: string;
        channelType?: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT';
        text?: string;
    }): Promise<{
        externalChannelId: string;
        received: {
            messageThreadId?: string;
            channelType?: "EMAIL" | "WHATSAPP" | "WEB_CHAT";
            text?: string;
        };
        at: string;
    }>;
}
