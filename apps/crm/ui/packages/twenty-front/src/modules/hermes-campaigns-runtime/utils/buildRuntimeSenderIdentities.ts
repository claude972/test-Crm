import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesSenderIdentity,
  type HermesSenderIdentityVerdict,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentity';

export type HermesRuntimeMessageChannel = {
  id: string;
  handle?: string | null;
  displayName?: string | null;
  type?: string | null;
  createdAt?: string | null;
  connectedAccount?: { id?: string | null; handle?: string | null } | null;
};

type BuildRuntimeSenderIdentitiesArgs = {
  channels: HermesRuntimeMessageChannel[];
  // The address this campaign sends from, as the campaign record published
  // it. Null when the record was not read or carries none.
  campaignFromAddress: string | null;
  // The server's verdict on that address, from the send preview. Null when
  // the preview did not answer.
  campaignSenderVerdict: HermesSenderIdentityVerdict | null;
};

const normalise = (address: string | null | undefined): string | null =>
  isNonEmptyString(address?.trim()) ? address.trim().toLowerCase() : null;

// The mailboxes that can be offered as a campaign sender, read from the
// message channels the server publishes.
//
// On the delegation, corrected: an earlier version of this helper treated a
// channel of type EMAIL_GROUP as the delegation record and inferred
// `delegated: true` from that type alone. That is not what the send path
// does. The emailing domain provider resolves the registered mailbox from the
// connection centre and authorises *exactly* the handle of that central MAIL
// connection's connected account, compared after trimming and lowercasing —
// a channel type grants nothing, and sharing a verified domain grants
// nothing either. So the type is no longer read as an authorisation.
//
// What is read instead is the server's own answer. `delegated` is true only
// where the send preview's verdict for this exact address says the campaign
// may depart, and null everywhere else — unknown, which is not a refusal and
// not a permission. The connection centre is not reachable from this module,
// so the one fact available about a given address is the verdict the server
// published for it, and nothing here invents the rest.
//
// The domain is left null on purpose. The server publishes no domain on a
// channel, and taking one out of the address would state a fact it never
// made. The reply-to is left null for the same reason: the channel's own
// handle is an internal inbound forwarding address, not a sender alias the
// server authorised.
//
// Only the identity the campaign actually sends from can carry a verdict,
// because the preview's verdict is about that address. Every other identity
// arrives without one. That makes it unavailable *for emitting*, which the
// emitting steps enforce — but it stays choosable, so a draft with no sender
// can be given one and an existing sender can be changed. Recording a sender
// writes the campaign record and emits nothing; the server is then asked
// again about the address that was actually stored.
export const buildRuntimeSenderIdentities = ({
  channels,
  campaignFromAddress,
  campaignSenderVerdict,
}: BuildRuntimeSenderIdentitiesArgs): {
  identities: HermesSenderIdentity[];
  campaignIdentityId: string | null;
} => {
  const normalisedCampaignFrom = normalise(campaignFromAddress);

  const identities = channels.map((channel): HermesSenderIdentity => {
    const mailboxAddress = normalise(channel.connectedAccount?.handle);
    const label = channel.displayName?.trim() ?? '';

    const isCampaignSender =
      isDefined(normalisedCampaignFrom) &&
      isDefined(mailboxAddress) &&
      mailboxAddress === normalisedCampaignFrom;

    const serverVerdict = isCampaignSender ? campaignSenderVerdict : null;

    return {
      id: channel.id,
      displayedAddress: mailboxAddress,
      // Never parsed out of the address: a guessed domain is a fact the
      // server never stated.
      domain: null,
      // No login is published for these channels, and a login would not be an
      // authorisation anyway.
      connectionLogin: null,
      delegatedMailbox: {
        label: isNonEmptyString(label) ? label : null,
        address: mailboxAddress,
        // The server's attestation for this exact address, or nothing. A
        // channel type is not a delegation, so it is never read as one.
        delegated: serverVerdict?.allowed === true ? true : null,
        // The channel's creation date is when the channel was made, not when
        // a delegation was attested. The server publishes no attestation
        // moment, so none is shown rather than one implied.
        attestedAt: null,
        proof: null,
      },
      // The server authorises exactly the delegated address, and publishes no
      // alias list.
      authorizedAliases: [],
      replyToAddress: null,
      state:
        serverVerdict?.allowed === true
          ? // The verdict covers the sending domain's verification and its
            // standing, so this is the server's own attestation.
            'verified'
          : null,
      unknownState:
        serverVerdict?.allowed === true ? null : 'NOT_ATTESTED_BY_SERVER',
      serverVerdict,
    };
  });

  const campaignIdentity = identities.find(
    (identity) =>
      isDefined(normalisedCampaignFrom) &&
      identity.displayedAddress === normalisedCampaignFrom,
  );

  return {
    identities,
    campaignIdentityId: campaignIdentity?.id ?? null,
  };
};
