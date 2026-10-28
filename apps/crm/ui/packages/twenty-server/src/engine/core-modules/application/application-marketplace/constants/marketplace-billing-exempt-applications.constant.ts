import { KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/application/application-marketplace/constants/kovaa-lab-public-app-universal-identifiers.constant';

// These apps run on every imported record or subscribed event, so metering
// each invocation would drain the free-tier allowance.
export const MARKETPLACE_BILLING_EXEMPT_UNIVERSAL_IDENTIFIERS: string[] = [
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.CALL_RECORDER,
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.LAST_CONTACT,
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.SLACK,
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.FATHOM,
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.GRANOLA,
  KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.TEAMS,
];
