import { BaseWorkspaceEntity, WorkspaceRelatedEntity } from './base';

export class AvailabilityWorkspaceEntity extends BaseWorkspaceEntity {
  type: 'BUSINESS_HOURS' | 'CUSTOM_SLOT' | 'BLOCKED';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  date: string;
  memberId: string;
  workspaceId: string;

  constructor(data: Partial<AvailabilityWorkspaceEntity>) {
    super(data);
    Object.assign(this, data);
  }
}