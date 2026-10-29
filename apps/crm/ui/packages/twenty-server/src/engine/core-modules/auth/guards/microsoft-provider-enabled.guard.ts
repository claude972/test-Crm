import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { MicrosoftStrategy } from 'src/engine/core-modules/auth/strategies/microsoft.auth.strategy';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class MicrosoftProviderEnabledGuard implements CanActivate {
  constructor(
    private readonly kovaaLabConfigService: KovaaLabCRMConfigService,
    private readonly guardRedirectService: GuardRedirectService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      if (!this.kovaaLabConfigService.get('AUTH_MICROSOFT_ENABLED')) {
        throw new AuthException(
          'Microsoft auth is not enabled',
          AuthExceptionCode.MICROSOFT_API_AUTH_DISABLED,
        );
      }

      new MicrosoftStrategy(this.kovaaLabConfigService);

      return true;
    } catch (err) {
      this.guardRedirectService.dispatchErrorFromGuard(
        context,
        err,
        this.guardRedirectService.getSubdomainAndCustomDomainFromContext(
          context,
        ),
      );

      return false;
    }
  }
}
