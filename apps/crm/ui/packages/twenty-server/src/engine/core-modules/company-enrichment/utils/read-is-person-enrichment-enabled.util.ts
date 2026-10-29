import { isNonEmptyString } from '@sniptt/guards';

import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export const readIsPersonEnrichmentEnabled = (
  kovaaLabConfigService: KovaaLabCRMConfigService,
): boolean =>
  kovaaLabConfigService.get('IS_ONBOARDING_AI_CHAT_ENABLED') &&
  isNonEmptyString(kovaaLabConfigService.get('PEOPLE_DATA_LABS_API_KEY'));
