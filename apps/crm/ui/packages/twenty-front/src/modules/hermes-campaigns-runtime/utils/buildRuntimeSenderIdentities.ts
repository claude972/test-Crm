import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesSenderIdentity,
  type HermesSenderIdentityVerdict,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { MessageChannelType } from '~/generated-metadata/graphql';

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

// The mailboxes the server will actually accept as a campaign sender, read
// from the message channels it publishes.
//
// A campaign send resolves its sender by looking for a message channel of
// type EMAIL_GROUP whose connected account carries exactly the from address.
// That channel is the delegation record, so it is the only thing read here as
// one: a channel of any other type carries no delegation, whatever address it
// shows and whatever domain that address is in.
//
// The domain is left null on purpose. The server publishes no domain on a
// channel, and taking one out of the address would state a fact it never
// made. The reply-to is left null for the same reason: the channel's own
// handle is an internal inbound forwarding address, not a sender alias the
// server authorised.
//
// Only the identity the campaign actually sends from can carry a verdict,
// because the preview's verdict is about that address. Every other identity
// arrives without one and reads as unverified, which is unavailable.
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
    const isEmailGroup = channel.type === MessageChannelType.EMAIL_GROUP;
    const isKnownType = Object.values<string>(MessageChannelType).includes(
      channel.type ?? '',
    );

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
        delegated: !isKnownType
          ? // An unpublished channel type says nothing about a delegation.
            null
          : isEmailGroup && isDefined(mailboxAddress),
        attestedAt: isNonEmptyString(channel.createdAt)
          ? channel.createdAt
          : null,
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
