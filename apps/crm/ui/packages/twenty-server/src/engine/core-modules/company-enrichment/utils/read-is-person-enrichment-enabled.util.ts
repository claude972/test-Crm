import { isNonEmptyString } from '@sniptt/guards';

import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

export const readIsPersonEnrichmentEnabled = (
  kovaa-labConfigService: KovaaLab CRMConfigService,
): boolean =>
  kovaa-labConfigService.get('IS_ONBOARDING_AI_CHAT_ENABLED') &&
  isNonEmptyString(kovaa-labConfigService.get('PEOPLE_DATA_LABS_API_KEY'));
