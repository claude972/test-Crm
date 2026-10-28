import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
import { GoogleOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
export declare class GoogleCalendarImportEventsService {
    private readonly googleOAuth2ClientProvider;
    constructor(googleOAuth2ClientProvider: GoogleOAuth2ClientProvider);
    getCalendarEvents(connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'id'>, eventExternalIds: string[]): Promise<FetchedCalendarEvent[]>;
}
