import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesAudienceExclusion,
  type HermesCampaignAudience,
} from '@/hermes-campaigns-ui/types/HermesCampaignAudience';

// The audience figures as the send preview publishes them.
export type HermesRuntimeAudiencePreview = {
  totalMembers?: number | null;
  withoutEmail?: number | null;
  duplicateEmails?: number | null;
  hardSuppressed?: number | null;
  globallyUnsubscribed?: number | null;
  topicUnsubscribed?: number | null;
  trackingRefused?: number | null;
  sendable?: number | null;
};

// Folds the server's audience figures into the screen's audience.
//
// Only figures the server published become rows: an absent figure produces no
// row at all rather than a zero. Two of its figures are deliberately not
// exclusions:
//
// - trackingRefused counts recipients who are still being sent to, so listing
//   it as an exclusion would overstate who is left out.
// - no figure maps onto 'invalid-address': the server counts members without
//   an address, which is an incomplete record, not a defective string. That
//   row is therefore absent rather than filled with the wrong figure.
//
// hardSuppressed is a bounce or a complaint, which is neither a standing
// refusal by a person nor a duplicate, so it travels under its own published
// name and the screen says it received a reason it does not know.
export const buildRuntimeAudience = (
  preview: HermesRuntimeAudiencePreview,
): HermesCampaignAudience => {
  const exclusions: HermesAudienceExclusion[] = [];

  const addContractExclusion = (
    reason: HermesAudienceExclusion['reason'],
    count: number | null | undefined,
  ) => {
    if (isDefined(count)) {
      exclusions.push({ reason, unknownReason: null, count });
    }
  };

  const addUnknownExclusion = (
    unknownReason: string,
    count: number | null | undefined,
  ) => {
    if (isDefined(count)) {
      exclusions.push({ reason: null, unknownReason, count });
    }
  };

  // Both unsubscribe figures are the same fact: a person who refused
  // marketing. They add up into one row instead of being shown twice.
  addContractExclusion('marketing-objection', preview.globallyUnsubscribed);
  addContractExclusion('marketing-objection', preview.topicUnsubscribed);
  addContractExclusion('resolved-duplicate', preview.duplicateEmails);
  addContractExclusion('incomplete-qualification', preview.withoutEmail);
  addUnknownExclusion('hardSuppressed', preview.hardSuppressed);

  return {
    retainedCount: isDefined(preview.sendable) ? preview.sendable : null,
    exclusions,
    // Nothing in the schema publishes the audience's personalisation
    // variables or how many records leave one empty, so none is declared
    // here: a variable the screen cannot confirm is not presented as known.
    variables: [],
  };
};
