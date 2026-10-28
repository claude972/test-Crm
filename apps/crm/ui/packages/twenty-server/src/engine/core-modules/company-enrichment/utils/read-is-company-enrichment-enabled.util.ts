import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { readBookCallStepMinEmployeeCount } from 'src/engine/core-modules/onboarding/utils/read-book-call-step-min-employee-count.util';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

// Enrichment is only worth running when something consumes it and the provider
// can actually answer, so callers can skip the round-trip entirely.
export const readIsCompanyEnrichmentEnabled = (
  kovaa-labConfigService: KovaaLab CRMConfigService,
): boolean => {
  const hasConsumer =
    kovaa-labConfigService.get('IS_ONBOARDING_AI_CHAT_ENABLED') ||
    isDefined(readBookCallStepMinEmployeeCount(kovaa-labConfigService));

  return (
    hasConsumer &&
    isNonEmptyString(kovaa-labConfigService.get('PEOPLE_DATA_LABS_API_KEY'))
  );
};
