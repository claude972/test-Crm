import { type Repository } from 'typeorm';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type CalendarEventComposerResult } from 'src/modules/calendar/calendar-event-creation-manager/types/calendar-event-composer-result.type';
import { type ComposeCalendarEventParams } from 'src/modules/calendar/calendar-event-creation-manager/types/compose-calendar-event-params.type';
export declare class CalendarEventComposerService {
    private readonly connectedAccountRepository;
    private readonly calendarChannelRepository;
    private readonly emailSchema;
    constructor(connectedAccountRepository: Repository<ConnectedAccountEntity>, calendarChannelRepository: Repository<CalendarChannelEntity>);
    composeCalendarEvent(params: ComposeCalendarEventParams, workspaceId: string): Promise<CalendarEventComposerResult>;
    private normalizeAndValidateInput;
    private validateDates;
    private parseAttendeeEmails;
    private resolveCalendarAccount;
    private resolveDefaultCalendarAccount;
    private findSyncEnabledCalendarChannel;
}
