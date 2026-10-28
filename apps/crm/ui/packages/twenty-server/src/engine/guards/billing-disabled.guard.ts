import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class BillingDisabledGuard implements CanActivate {
  constructor(private readonly kovaa-labConfigService: KovaaLab CRMConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    return !this.kovaa-labConfigService.isBillingEnabled();
  }
}
