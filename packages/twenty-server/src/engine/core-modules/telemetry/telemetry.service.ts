import { Injectable } from '@nestjs/common';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { USER_SIGNUP_EVENT_NAME } from 'src/engine/api/graphql/workspace-query-runner/constants/user-signup-event-name.constants';
import { TelemetryEventType } from 'src/engine/core-modules/telemetry/telemetry-event.type';

type TelemetrySignUpEvent = {
  action: typeof USER_SIGNUP_EVENT_NAME;
  events: TelemetryEventType[];
};

type TelemetryEventPayload = TelemetrySignUpEvent;

@Injectable()
export class TelemetryService {
  constructor(
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async publish(payload: TelemetryEventPayload) {
    if (!this.kovaa-labConfigService.get('TELEMETRY_ENABLED')) {
      return { success: true };
    }

    try {
      const httpClient = this.secureHttpClientService.getHttpClient({
        baseURL: 'https://kovaa-lab-telemetry.com/api/v2',
      });

      await Promise.all(
        payload.events.map((event) =>
          httpClient.post(`/selfHostingEvent`, {
            action: payload.action,
            ...event,
          }),
        ),
      );
    } catch {
      return { success: false };
    }

    return { success: true };
  }
}
