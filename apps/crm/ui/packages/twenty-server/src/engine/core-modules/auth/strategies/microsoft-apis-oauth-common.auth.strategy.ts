import { PassportStrategy } from '@nestjs/passport';

import { Strategy } from 'passport-microsoft';
import { type VerifyCallback } from 'passport-google-oauth20';

import { getMicrosoftApisOauthScopes } from 'src/engine/core-modules/auth/utils/get-microsoft-apis-oauth-scopes';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export type MicrosoftApiScopeConfig = {
  isCalendarEnabled?: boolean;
  isMessagingAliasFetchingEnabled?: boolean;
};

export abstract class MicrosoftAPIsOauthCommonStrategy extends PassportStrategy(
  Strategy,
  'microsoft-apis',
) {
  constructor(kovaaLabConfigService: KovaaLabCRMConfigService) {
    const scopes = getMicrosoftApisOauthScopes();

    super({
      clientID: kovaaLabConfigService.get('AUTH_MICROSOFT_CLIENT_ID'),
      clientSecret: kovaaLabConfigService.get('AUTH_MICROSOFT_CLIENT_SECRET'),
      tenant: 'common',
      callbackURL: kovaaLabConfigService.get('AUTH_MICROSOFT_APIS_CALLBACK_URL'),
      scope: scopes,
      passReqToCallback: true,
    });
  }

  abstract validate(
    request: Express.Request,
    accessToken: string,
    refreshToken: string,
    profile: unknown,
    done: VerifyCallback,
  ): Promise<void>;
}
