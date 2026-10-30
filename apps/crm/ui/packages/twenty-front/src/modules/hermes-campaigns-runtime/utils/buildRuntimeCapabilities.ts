import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCampaignCapabilities,
  type HermesCampaignCapability,
} from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import {
  RUNTIME_CANCELABLE_STATUSES,
  readRuntimeCampaignState,
} from '@/hermes-campaigns-runtime/utils/readRuntimeCampaign';

export type HermesRuntimeSendBlocker = {
  code?: string | null;
  message?: string | null;
};

type BuildRuntimeCapabilitiesArgs = {
  // The blockers the server published on the send preview. Null when it did
  // not answer at all, which is not the same as an empty list.
  blockers: HermesRuntimeSendBlocker[] | null;
  // The campaign status, exactly as the record published it. Null when the
  // record was not read.
  campaignStatus: string | null;
};

// Only a string with something in it is a published value; anything else is
// nothing published at all.
const readPublished = (value: string | null | undefined): string | null =>
  isNonEmptyString(value) ? value : null;

// Nothing readable was published. Unverified is unavailable.
const unavailable = (): HermesCampaignCapability => ({
  allowed: null,
  reasonCode: null,
  reason: null,
});

const allowed = (): HermesCampaignCapability => ({
  allowed: true,
  reasonCode: null,
  reason: null,
});

const refused = (
  reasonCode: string | null,
  reason: string | null,
): HermesCampaignCapability => ({
  allowed: false,
  reasonCode,
  reason,
});

// Turns the server's answers into the five capabilities the screen reads.
//
// Only three of the five have anything published behind them:
//
// - schedule and send come from `previewMessageCampaignSend`, whose blockers
//   are the server's own verdict on whether this campaign may depart. It
//   re-runs the whole check — status, list, sender, verified sending domain,
//   subject, body, credits — so an empty blockers list is the server saying
//   yes, and a blocker is the server saying no with its own code.
// - cancel comes from the published status, which is the fact the lifecycle
//   service's own guard tests, and that guard runs again on the call.
// - preview and testSynthetic have no published capability anywhere in the
//   schema, so they stay unavailable. Nothing here invents one from a name, a
//   pilot flag or an interface boolean.
export const buildRuntimeCapabilities = ({
  blockers,
  campaignStatus,
}: BuildRuntimeCapabilitiesArgs): HermesCampaignCapabilities => {
  const firstBlocker = isDefined(blockers) ? blockers.at(0) : undefined;

  const sendability = !isDefined(blockers)
    ? unavailable()
    : !isDefined(firstBlocker)
      ? allowed()
      : refused(
          readPublished(firstBlocker.code),
          readPublished(firstBlocker.message),
        );

  const cancel = !isDefined(campaignStatus)
    ? unavailable()
    : RUNTIME_CANCELABLE_STATUSES.includes(campaignStatus)
      ? allowed()
      : // A status outside the contract says nothing about cancelling; a
        // status inside it that is not cancelable is the server's own refusal.
        !isDefined(readRuntimeCampaignState(campaignStatus))
        ? unavailable()
        : refused('MESSAGE_CAMPAIGN_NOT_CANCELABLE', null);

  return {
    preview: unavailable(),
    testSynthetic: unavailable(),
    schedule: sendability,
    send: sendability,
    cancel,
    // The server publishes no moment for this set, so its age is unknown
    // rather than presented as fresh.
    checkedAt: null,
  };
};
