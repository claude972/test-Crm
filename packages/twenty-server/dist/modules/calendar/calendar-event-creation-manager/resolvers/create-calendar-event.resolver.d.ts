import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { type I18nContext } from 'src/engine/core-modules/i18n/types/i18n-context.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountMetadataService } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.service';
import { CreateCalendarEventOutputDTO } from 'src/modules/calendar/calendar-event-creation-manager/dtos/create-calendar-event-output.dto';
import { CreateCalendarEventInput } from 'src/modules/calendar/calendar-event-creation-manager/dtos/create-calendar-event.input';
import { CalendarEventComposerService } from 'src/modules/calendar/calendar-event-creation-manager/services/calendar-event-composer.service';
import { CreateCalendarEventService } from 'src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service';
export declare class CreateCalendarEventResolver {
    private readonly connectedAccountMetadataService;
    private readonly calendarEventComposerService;
    private readonly createCalendarEventService;
    private readonly i18nService;
    private readonly logger;
    constructor(connectedAccountMetadataService: ConnectedAccountMetadataService, calendarEventComposerService: CalendarEventComposerService, createCalendarEventService: CreateCalendarEventService, i18nService: I18nService);
    createCalendarEvent(input: CreateCalendarEventInput, workspace: WorkspaceEntity, userWorkspaceId: string, context: I18nContext): Promise<CreateCalendarEventOutputDTO>;
}
