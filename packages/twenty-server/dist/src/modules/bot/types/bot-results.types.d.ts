/**
 * Result types for bot operations.
 */
export type SearchResult = {
    results: any[];
    total: number;
    hasMore: boolean;
};
export type SendMessageResult = {
    success: boolean;
    messageId?: string;
    error?: string;
};
export type ScheduleRdvResult = {
    success: boolean;
    eventId?: string;
    error?: string;
};
