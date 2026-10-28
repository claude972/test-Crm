import { BaseWorkspaceEntity } from 'src/engine/kovaa-lab-orm/base.workspace-entity';
export declare class AvailabilityWorkspaceEntity extends BaseWorkspaceEntity {
    type: 'BUSINESS_HOURS' | 'CUSTOM_SLOT' | 'BLOCKED';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    date: string;
    memberId: string;
    workspaceId: string;
    constructor(data: Partial<AvailabilityWorkspaceEntity>);
}
