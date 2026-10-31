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
  // the preview did not answer. It says nothing about the mailbox: the
  // preview never resolves the MAIL connection or the transport.
  campaignSenderVerdict: HermesSenderIdentityVerdict | null;
  // The exact handle of the connected account the central MAIL connection
  // names, as the connection centre resolved it. Null while that is unknown —
  // loading, absent, unreadable, or naming an account that does not answer.
  // An unknown central mailbox attests nothing about any identity.
  centralMailboxAddress: string | null;
};

const normalise = (address: string | null | undefined): string | null =>
  isNonEmptyString(address?.trim()) ? address.trim().toLowerCase() : null;

// The mailboxes that can be offered as a campaign sender, read from the
// message channels the server publishes.
//
// On the delegation, corrected twice. The first version read a channel of
// type EMAIL_GROUP as the delegation record; the second read the send
// preview's verdict. Both were wrong, for the same underlying reason: neither
// control ever looked at the mailbox.
//
// What the send path actually does is resolve the registered mailbox from the
// connection centre and authorise *exactly* the handle of that central MAIL
// connection's connected account, compared after trimming and lowercasing. A
// channel type grants nothing, and sharing a verified domain grants nothing.
//
// And the send preview cannot stand in for it: `checkCampaignSendOrThrow`
// verifies content, domain, audience and billing, and never resolves the MAIL
// connection or the transport. So an empty blocker list is entirely
// compatible with no central connection existing at all, or with a different
// account being the one that would really send. Reading delegation out of it
// was a false proof.
//
// So the attestation comes from the connection centre, passed in here as
// `centralMailboxAddress`: the exact handle of the account the central MAIL
// connection names. The identity carrying that address is the registered
// mailbox; every other identity is `delegated: null` — unknown, which is
// neither a refusal nor a permission.
//
// Being the registered mailbox is still not proof that a send would succeed.
// Transport availability is not established by any read here and stays
// unproven until a probe or an actual send says otherwise, which is why
// 'verified' additionally requires the server's own send verdict.
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
  centralMailboxAddress,
}: BuildRuntimeSenderIdentitiesArgs): {
  identities: HermesSenderIdentity[];
  campaignIdentityId: string | null;
  // The identity that is genuinely the registered mailbox, when one of them
  // is. Offered as the sender to record on a campaign that has none.
  centralIdentityId: string | null;
} => {
  const normalisedCampaignFrom = normalise(campaignFromAddress);
  const normalisedCentralMailbox = normalise(centralMailboxAddress);

  const identities = channels.map((channel): HermesSenderIdentity => {
    const mailboxAddress = normalise(channel.connectedAccount?.handle);
    const label = channel.displayName?.trim() ?? '';

    const isCampaignSender =
      isDefined(normalisedCampaignFrom) &&
      isDefined(mailboxAddress) &&
      mailboxAddress === normalisedCampaignFrom;

    const serverVerdict = isCampaignSender ? campaignSenderVerdict : null;

    // The connection centre named this exact account. That is the delegation
    // fact, and the only one available.
    const isCentralMailbox =
      isDefined(normalisedCentralMailbox) &&
      isDefined(mailboxAddress) &&
      mailboxAddress === normalisedCentralMailbox;

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
        // Attested by the connection centre naming this exact account, or
        // unknown. Never inferred from a channel type, and never from the
        // send preview, which does not look at the mailbox.
        delegated: isCentralMailbox ? true : null,
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
      // Both facts are required, because each covers what the other does
      // not: the connection centre attests which mailbox is registered, and
      // the send verdict covers the content, the domain, the audience and the
      // billing. Neither alone makes this identity usable, and together they
      // still do not prove the transport works.
      state:
        isCentralMailbox && serverVerdict?.allowed === true ? 'verified' : null,
      unknownState:
        isCentralMailbox && serverVerdict?.allowed === true
          ? null
          : !isCentralMailbox
            ? 'NOT_THE_REGISTERED_MAILBOX'
            : 'NOT_ATTESTED_BY_SERVER',
      serverVerdict,
    };
  });

  const campaignIdentity = identities.find(
    (identity) =>
      isDefined(normalisedCampaignFrom) &&
      identity.displayedAddress === normalisedCampaignFrom,
  );

  const centralIdentity = identities.find(
    (identity) =>
      isDefined(normalisedCentralMailbox) &&
      identity.displayedAddress === normalisedCentralMailbox,
  );

  return {
    identities,
    campaignIdentityId: campaignIdentity?.id ?? null,
    centralIdentityId: centralIdentity?.id ?? null,
  };
};
