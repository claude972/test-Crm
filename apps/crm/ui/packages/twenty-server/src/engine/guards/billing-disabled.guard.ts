import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class BillingDisabledGuard implements CanActivate {
  constructor(private readonly kovaaLabConfigService: KovaaLabCRMConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    return !this.kovaaLabConfigService.isBillingEnabled();
  }
}
