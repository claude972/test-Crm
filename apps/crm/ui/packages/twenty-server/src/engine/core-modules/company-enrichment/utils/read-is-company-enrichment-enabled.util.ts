import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { readBookCallStepMinEmployeeCount } from 'src/engine/core-modules/onboarding/utils/read-book-call-step-min-employee-count.util';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// Enrichment is only worth running when something consumes it and the provider
// can actually answer, so callers can skip the round-trip entirely.
export const readIsCompanyEnrichmentEnabled = (
  kovaaLabConfigService: KovaaLabCRMConfigService,
): boolean => {
  const hasConsumer =
    kovaaLabConfigService.get('IS_ONBOARDING_AI_CHAT_ENABLED') ||
    isDefined(readBookCallStepMinEmployeeCount(kovaaLabConfigService));

  return (
    hasConsumer &&
    isNonEmptyString(kovaaLabConfigService.get('PEOPLE_DATA_LABS_API_KEY'))
  );
};
