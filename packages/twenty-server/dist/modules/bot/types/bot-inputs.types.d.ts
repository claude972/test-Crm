/**
 * Input types for bot operations.
 */
export type SearchLeadInput = {
    query: string;
    filters?: Record<string, any>;
    limit?: number;
};
export type SearchDealInput = {
    query: string;
    filters?: Record<string, any>;
    limit?: number;
};
export type SendMessageInput = {
    recipient: string;
    message: string;
    channel?: 'EMAIL' | 'WHATSAPP' | 'WEB_CHAT';
    metadata?: Record<string, any>;
};
export type ScheduleRdvInput = {
    title: string;
    start: string;
    end: string;
    attendees: string[];
    description?: string;
    metadata?: Record<string, any>;
};
