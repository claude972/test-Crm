export declare class AvailabilityEntity {
    type: 'BUSINESS_HOURS' | 'CUSTOM_SLOT' | 'BLOCKED';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    date: string;
    memberId: string;
    workspaceId: string;
    constructor(data: Partial<AvailabilityEntity>);
}
