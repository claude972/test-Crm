import { type OnModuleInit } from '@nestjs/common';
import { type ObjectRecord } from 'kovaa-lab-shared/types';
import { Repository } from 'typeorm';
import { CommonRecordVisibilityService } from 'src/engine/api/common/common-record-visibility/common-record-visibility.service';
import { type RecordVisibilityRestrictionHandler } from 'src/engine/api/common/common-record-visibility/types/record-visibility-restriction-handler.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
export declare class ApplyCalendarEventsVisibilityRestrictionsService implements RecordVisibilityRestrictionHandler, OnModuleInit {
    private readonly workspaceOrmManager;
    private readonly commonRecordVisibilityService;
    private readonly calendarChannelRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, commonRecordVisibilityService: CommonRecordVisibilityService, calendarChannelRepository: Repository<CalendarChannelEntity>);
    onModuleInit(): void;
    applyVisibilityRestrictions({ records, authContext, }: {
        records: ObjectRecord[];
        authContext: WorkspaceAuthContext;
    }): Promise<void>;
    private findVisibleCalendarEventIds;
}
