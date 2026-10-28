import { type GraphError } from '@microsoft/microsoft-graph-client';
import { CalendarEventImportDriverException } from 'src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception';
export declare const parseMicrosoftCalendarError: (error: GraphError) => CalendarEventImportDriverException;
